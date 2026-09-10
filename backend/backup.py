"""Backup automático diário do banco (via pg_dump real, formato custom —
restaurável com pg_restore) + política de retenção. Metadados de cada
execução ficam na tabela `backups`; o arquivo .dump em si fica em disco, em
config.BACKUP_DIR (precisa ser um volume persistente em produção — ver
docker-compose.yml).

Não usa scheduler externo (APScheduler, cron): o loop diário fica em
jobs.py, no mesmo padrão dos outros jobs de fundo (lembrete de reunião,
onboarding parado, SLA de solicitações). Este módulo só sabe "rodar um
backup agora" e "aplicar retenção" — quem decide a hora é jobs.py.
"""

import logging
import os
import subprocess
import threading
from datetime import datetime, timedelta, timezone

from config import BACKUP_DIR, BACKUP_RETENCAO_DIAS, DATABASE_URL, PG_DUMP_PATH
from database import fetch_all, fetch_one, get_connection

logger = logging.getLogger("backup")

_TIMEOUT_SEG = 30 * 60  # pg_dump não deveria levar perto disso com o volume atual do banco
_STALE_APOS_HORAS = 3  # EM_ANDAMENTO mais velho que isso = processo morreu sem atualizar o status
_lock = threading.Lock()


def _marcar_stale_como_falha() -> None:
    """Se o processo caiu no meio de um backup, a linha fica presa em
    EM_ANDAMENTO pra sempre — sem isso, nenhum backup novo rodaria de novo."""
    limite = datetime.now(timezone.utc) - timedelta(hours=_STALE_APOS_HORAS)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE backups SET status = 'FALHA', finalizado_em = now(),
                       erro = 'Processo interrompido antes de concluir (backup travado em andamento).'
                WHERE status = 'EM_ANDAMENTO' AND iniciado_em < %s;
                """,
                (limite,),
            )
        conn.commit()


def _backup_em_andamento() -> bool:
    return fetch_one("SELECT 1 FROM backups WHERE status = 'EM_ANDAMENTO' LIMIT 1;") is not None


def ja_rodou_hoje(hoje: datetime) -> bool:
    """`hoje` já deve vir no fuso certo (America/Sao_Paulo) — só a parte de
    data é usada, pra decidir se o job diário ainda precisa disparar."""
    row = fetch_one(
        "SELECT 1 FROM backups WHERE iniciado_em >= %s LIMIT 1;",
        (hoje.replace(hour=0, minute=0, second=0, microsecond=0),),
    )
    return row is not None


def executar_backup(tipo: str = "AUTOMATICO") -> None:
    """Roda pg_dump de verdade contra o banco. Bloqueante — sempre chamar via
    asyncio.to_thread (job de fundo) ou BackgroundTasks (endpoint manual),
    nunca direto numa rota síncrona (travaria o worker por minutos)."""
    _marcar_stale_como_falha()

    if not _lock.acquire(blocking=False):
        logger.info("Backup já em andamento neste processo — ignorando novo disparo (%s).", tipo)
        return
    try:
        if _backup_em_andamento():
            logger.info("Já existe um backup EM_ANDAMENTO registrado — ignorando novo disparo (%s).", tipo)
            return
        _executar(tipo)
    finally:
        _lock.release()


def _executar(tipo: str) -> None:
    if not DATABASE_URL:
        logger.error("Backup abortado: DATABASE_URL não configurada.")
        return

    os.makedirs(BACKUP_DIR, exist_ok=True)

    agora_brt = datetime.now(timezone(timedelta(hours=-3)))
    nome_arquivo = f"backup_{agora_brt.strftime('%Y%m%d_%H%M%S')}.dump"
    caminho_final = os.path.join(BACKUP_DIR, nome_arquivo)
    caminho_parcial = caminho_final + ".part"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO backups (tipo, status) VALUES (%s, 'EM_ANDAMENTO') RETURNING id;", (tipo,))
            backup_id = cur.fetchone()["id"]
        conn.commit()

    logger.info("Backup %s iniciado (id=%s, arquivo=%s).", tipo, backup_id, nome_arquivo)

    try:
        resultado = subprocess.run(
            [
                PG_DUMP_PATH,
                DATABASE_URL,
                "--format=custom",
                "--no-owner",
                "--no-privileges",
                # Só o schema "public" — é onde vive 100% das tabelas da
                # aplicação (ver db/schema.sql, nenhum `create schema`
                # próprio). Sem isso, o dump viria com auth/storage/realtime/
                # vault etc. do Supabase: infraestrutura interna do provedor,
                # não dado da aplicação, e cujas roles (supabase_admin etc.)
                # não existem fora do projeto Supabase original — restaurar
                # isso em outro lugar quebraria ou não faria sentido.
                "--schema=public",
                f"--file={caminho_parcial}",
            ],
            capture_output=True,
            text=True,
            timeout=_TIMEOUT_SEG,
        )
    except FileNotFoundError:
        _marcar_resultado(
            backup_id, sucesso=False,
            erro=f"pg_dump não encontrado (PG_DUMP_PATH={PG_DUMP_PATH!r}) — verifique se postgresql-client está instalado.",
        )
        return
    except subprocess.TimeoutExpired:
        _limpar_parcial(caminho_parcial)
        _marcar_resultado(backup_id, sucesso=False, erro=f"pg_dump excedeu o tempo limite de {_TIMEOUT_SEG // 60} minutos.")
        return
    except Exception as exc:  # noqa: BLE001 — qualquer falha aqui vira registro de erro, nunca exceção solta num job de fundo
        _limpar_parcial(caminho_parcial)
        _marcar_resultado(backup_id, sucesso=False, erro=f"Erro inesperado ao rodar pg_dump: {exc}")
        return

    if resultado.returncode != 0:
        _limpar_parcial(caminho_parcial)
        erro = (resultado.stderr or "").strip()[-2000:] or f"pg_dump saiu com código {resultado.returncode}."
        _marcar_resultado(backup_id, sucesso=False, erro=erro)
        logger.error("Backup %s falhou (id=%s): %s", tipo, backup_id, erro)
        return

    # Só renomeia pro nome final depois do pg_dump terminar com sucesso —
    # assim um arquivo com o nome "definitivo" nunca fica meio-escrito.
    os.replace(caminho_parcial, caminho_final)
    tamanho = os.path.getsize(caminho_final)
    _marcar_resultado(backup_id, sucesso=True, arquivo_nome=nome_arquivo, tamanho_bytes=tamanho)
    logger.info("Backup %s concluído (id=%s, arquivo=%s, %.1f MB).", tipo, backup_id, nome_arquivo, tamanho / 1024 / 1024)

    _aplicar_retencao()


def _limpar_parcial(caminho_parcial: str) -> None:
    try:
        if os.path.exists(caminho_parcial):
            os.remove(caminho_parcial)
    except OSError:
        logger.exception("Não foi possível remover arquivo parcial de backup: %s", caminho_parcial)


def _marcar_resultado(
    backup_id: str, sucesso: bool, arquivo_nome: str | None = None, tamanho_bytes: int | None = None, erro: str | None = None
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE backups
                SET status = %s, finalizado_em = now(), arquivo_nome = %s, tamanho_bytes = %s, erro = %s
                WHERE id = %s;
                """,
                ("SUCESSO" if sucesso else "FALHA", arquivo_nome, tamanho_bytes, erro, backup_id),
            )
        conn.commit()


def _aplicar_retencao() -> None:
    """Remove backups mais velhos que BACKUP_RETENCAO_DIAS — mas nunca o
    backup de sucesso mais recente, mesmo que ele já tenha estourado o prazo
    (proteção contra uma retenção mal configurada apagar o único backup
    válido que existe)."""
    limite = datetime.now(timezone.utc) - timedelta(days=BACKUP_RETENCAO_DIAS)

    mais_recente_sucesso = fetch_one(
        "SELECT id FROM backups WHERE status = 'SUCESSO' ORDER BY finalizado_em DESC LIMIT 1;"
    )
    if not mais_recente_sucesso:
        return

    antigos = fetch_all(
        "SELECT id, arquivo_nome FROM backups WHERE iniciado_em < %s AND id != %s;",
        (limite, mais_recente_sucesso["id"]),
    )
    if not antigos:
        return

    ids_para_remover = []
    for b in antigos:
        if b["arquivo_nome"]:
            caminho = os.path.join(BACKUP_DIR, b["arquivo_nome"])
            try:
                if os.path.exists(caminho):
                    os.remove(caminho)
            except OSError:
                logger.exception("Não foi possível remover arquivo de backup expirado: %s", caminho)
                continue  # não apaga o registro se o arquivo não pôde ser removido
        ids_para_remover.append(str(b["id"]))

    if not ids_para_remover:
        return

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM backups WHERE id = ANY(%s::uuid[]);", (ids_para_remover,))
        conn.commit()
    logger.info(
        "Retenção de backups: %d registro(s) removido(s) (mais velhos que %d dias).",
        len(ids_para_remover), BACKUP_RETENCAO_DIAS,
    )
