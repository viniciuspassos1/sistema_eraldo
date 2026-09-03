"""Jobs de fundo do backend — só rodam se ENABLE_BACKGROUND_JOBS=true
(ver config.py). Cobrem três lacunas que dependiam de alguém estar de olho
na tela:

1. Lembrete de reunião por e-mail — complementar ao alerta sonoro do
   frontend (AgendaAlerts.tsx), que só dispara com a aba aberta.
2. Onboarding parado — avisa o próprio funcionário e os administradores
   quando o checklist não avança há alguns dias.
3. SLA de solicitações — avisa o responsável (ou os administradores, se
   não tiver responsável) quando uma solicitação fica aberta por tempo
   demais sem conclusão.

Sem scheduler externo (APScheduler, cron): dois loops assíncronos simples,
iniciados no lifespan do FastAPI. Consultas ao banco são bloqueantes
(psycopg2), por isso rodam em thread separada (asyncio.to_thread) para não
travar o event loop que também atende requisições HTTP.
"""

import asyncio
import logging
from datetime import date, datetime, timedelta

from database import fetch_all, get_connection
from emailer import enviar_email, smtp_configurado

logger = logging.getLogger("jobs")

INTERVALO_LEMBRETE_SEG = 60
JANELA_LEMBRETE_MIN = 10
INTERVALO_DIARIO_SEG = 6 * 60 * 60
ONBOARDING_ALERTA_DIAS = 7
SOLICITACAO_SLA_DIAS = 5


def _minutos_ate(horario, agora: datetime) -> float:
    alvo = agora.replace(hour=horario.hour, minute=horario.minute, second=0, microsecond=0)
    return (alvo - agora).total_seconds() / 60


def _admins_ativos() -> list[dict]:
    return fetch_all("SELECT id FROM usuarios WHERE perfil = 'ADMINISTRADOR' AND status = 'ATIVO';")


def _inserir_notificacao(cur, destinatario_id: str, mensagem: str, tipo: str) -> None:
    cur.execute(
        "INSERT INTO notificacoes (destinatario_id, mensagem, tipo) VALUES (%s, %s, %s);",
        (destinatario_id, mensagem, tipo),
    )


def _checar_lembretes_reuniao() -> None:
    if not smtp_configurado():
        return
    agora = datetime.now()
    hoje = agora.date()

    eventos = fetch_all(
        """
        SELECT e.id, e.titulo, e.horario, u.email, u.nome
        FROM agenda_eventos e
        JOIN usuarios u ON u.id = e.responsavel_id
        WHERE e.data = %s AND e.lembrete_email_enviado = false;
        """,
        (hoje,),
    )
    for ev in eventos:
        minutos = _minutos_ate(ev["horario"], agora)
        if not (0 < minutos <= JANELA_LEMBRETE_MIN):
            continue
        enviado = enviar_email(
            ev["email"],
            f"Lembrete: {ev['titulo']} às {ev['horario'].strftime('%H:%M')}",
            f"Olá, {ev['nome']}.\n\n"
            f'Você tem "{ev["titulo"]}" agendado para {ev["horario"].strftime("%H:%M")} de hoje, '
            f"daqui a {round(minutos)} minutos.",
        )
        if enviado:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE agenda_eventos SET lembrete_email_enviado = true WHERE id = %s;", (ev["id"],))
                conn.commit()

    anotacoes = fetch_all(
        """
        SELECT a.id, a.titulo, a.horario, u.email, u.nome
        FROM agenda_anotacoes a
        JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.data = %s AND a.lembrete_email_enviado = false;
        """,
        (hoje,),
    )
    for nota in anotacoes:
        minutos = _minutos_ate(nota["horario"], agora)
        if not (0 < minutos <= JANELA_LEMBRETE_MIN):
            continue
        enviado = enviar_email(
            nota["email"],
            f"Lembrete: {nota['titulo']} às {nota['horario'].strftime('%H:%M')}",
            f"Olá, {nota['nome']}.\n\n"
            f'Você tem "{nota["titulo"]}" marcado para {nota["horario"].strftime("%H:%M")} de hoje, '
            f"daqui a {round(minutos)} minutos.",
        )
        if enviado:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE agenda_anotacoes SET lembrete_email_enviado = true WHERE id = %s;", (nota["id"],))
                conn.commit()


def _ja_notificado_recentemente(
    tipo: str, desde: datetime, destinatario_id: str | None = None, filtro_mensagem: str | None = None
) -> bool:
    query = "SELECT 1 FROM notificacoes WHERE tipo = %s AND data >= %s"
    params: list = [tipo, desde]
    if destinatario_id is not None:
        query += " AND destinatario_id = %s"
        params.append(destinatario_id)
    if filtro_mensagem is not None:
        query += " AND mensagem LIKE %s"
        params.append(filtro_mensagem)
    query += " LIMIT 1;"
    return bool(fetch_all(query, tuple(params)))


def _checar_onboarding_parado() -> None:
    limite = date.today() - timedelta(days=ONBOARDING_ALERTA_DIAS)
    candidatos = fetch_all(
        """
        SELECT u.id, u.nome,
               COUNT(p.item_id) FILTER (WHERE p.concluido) AS concluidos,
               (SELECT COUNT(*) FROM onboarding_checklist_itens) AS total,
               COALESCE(MAX(p.concluido_em)::date, u.data_entrada) AS ultimo_avanco
        FROM usuarios u
        LEFT JOIN onboarding_progresso p ON p.funcionario_id = u.id
        WHERE u.status = 'ATIVO'
        GROUP BY u.id, u.nome, u.data_entrada
        HAVING COUNT(p.item_id) FILTER (WHERE p.concluido) < (SELECT COUNT(*) FROM onboarding_checklist_itens)
           AND COALESCE(MAX(p.concluido_em)::date, u.data_entrada) <= %s;
        """,
        (limite,),
    )
    if not candidatos:
        return

    desde = datetime.now() - timedelta(days=ONBOARDING_ALERTA_DIAS)
    admins = _admins_ativos()

    for c in candidatos:
        if _ja_notificado_recentemente("ONBOARDING", desde, destinatario_id=c["id"]):
            continue
        percentual = round(100 * c["concluidos"] / c["total"]) if c["total"] else 0
        with get_connection() as conn:
            with conn.cursor() as cur:
                _inserir_notificacao(
                    cur, c["id"],
                    f"Seu onboarding está {percentual}% concluído e sem avanço há alguns dias — continue de onde parou.",
                    "ONBOARDING",
                )
                for admin in admins:
                    _inserir_notificacao(
                        cur, admin["id"],
                        f"Onboarding de {c['nome']} está parado em {percentual}% há mais de {ONBOARDING_ALERTA_DIAS} dias.",
                        "ONBOARDING",
                    )
            conn.commit()


def _checar_solicitacoes_sla() -> None:
    limite = date.today() - timedelta(days=SOLICITACAO_SLA_DIAS)
    paradas = fetch_all(
        """
        SELECT id, numero, categoria, data, responsavel_id
        FROM solicitacoes
        WHERE status IN ('ABERTO', 'EM_ANALISE') AND data <= %s;
        """,
        (limite,),
    )
    if not paradas:
        return

    desde = datetime.now() - timedelta(days=SOLICITACAO_SLA_DIAS)
    admins = None

    with get_connection() as conn:
        with conn.cursor() as cur:
            for s in paradas:
                if _ja_notificado_recentemente(
                    "SOLICITACAO",
                    desde,
                    destinatario_id=s["responsavel_id"],
                    filtro_mensagem=f"%{s['numero']}%",
                ):
                    continue
                dias_aberta = (date.today() - s["data"]).days
                mensagem = f"Solicitação {s['numero']} ({s['categoria']}) está aberta há {dias_aberta} dias sem conclusão."
                if s["responsavel_id"]:
                    _inserir_notificacao(cur, s["responsavel_id"], mensagem, "SOLICITACAO")
                else:
                    if admins is None:
                        admins = _admins_ativos()
                    for admin in admins:
                        _inserir_notificacao(cur, admin["id"], mensagem, "SOLICITACAO")
        conn.commit()


async def _loop_lembretes_reuniao() -> None:
    while True:
        try:
            await asyncio.to_thread(_checar_lembretes_reuniao)
        except Exception:
            logger.exception("Erro ao checar lembretes de reunião por e-mail")
        await asyncio.sleep(INTERVALO_LEMBRETE_SEG)


async def _loop_diario() -> None:
    while True:
        try:
            await asyncio.to_thread(_checar_onboarding_parado)
            await asyncio.to_thread(_checar_solicitacoes_sla)
        except Exception:
            logger.exception("Erro ao checar alertas diários (onboarding/SLA)")
        await asyncio.sleep(INTERVALO_DIARIO_SEG)


_tarefas: list[asyncio.Task] = []


def iniciar_jobs() -> None:
    _tarefas.append(asyncio.create_task(_loop_lembretes_reuniao()))
    _tarefas.append(asyncio.create_task(_loop_diario()))
    logger.info("Jobs de fundo iniciados (lembrete de reunião, onboarding, SLA de solicitações).")


def parar_jobs() -> None:
    for tarefa in _tarefas:
        tarefa.cancel()
    _tarefas.clear()
