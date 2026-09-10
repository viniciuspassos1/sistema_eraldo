"""Histórico e disparo manual do backup do banco — ver backend/backup.py
para a lógica de execução (pg_dump real) e a decisão de agendamento diário."""

import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from security import require_api_key, require_admin, UsuarioAtual
from database import fetch_all, fetch_one
from config import BACKUP_DIR
from backup import executar_backup
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_admin)])

_COLUNAS = "id, tipo, status, iniciado_em, finalizado_em, arquivo_nome, tamanho_bytes, erro"


class Backup(BaseModel):
    id: str
    tipo: str
    status: str
    iniciadoEm: str
    finalizadoEm: str | None = None
    arquivoNome: str | None = None
    tamanhoBytes: int | None = None
    erro: str | None = None


def _serialize(row: dict) -> Backup:
    return Backup(
        id=str(row["id"]),
        tipo=row["tipo"],
        status=row["status"],
        iniciadoEm=row["iniciado_em"].isoformat(),
        finalizadoEm=row["finalizado_em"].isoformat() if row["finalizado_em"] else None,
        arquivoNome=row["arquivo_nome"],
        tamanhoBytes=row["tamanho_bytes"],
        erro=row["erro"],
    )


@router.get("/api/backups", response_model=list[Backup])
def listar_backups(_admin: UsuarioAtual = Depends(require_admin)):
    rows = fetch_all(f"SELECT {_COLUNAS} FROM backups ORDER BY iniciado_em DESC LIMIT 200;")
    return [_serialize(r) for r in rows]


@router.post("/api/backups", status_code=202)
def disparar_backup_manual(background_tasks: BackgroundTasks, admin: UsuarioAtual = Depends(require_admin)):
    em_andamento = fetch_one("SELECT 1 FROM backups WHERE status = 'EM_ANDAMENTO' LIMIT 1;")
    if em_andamento:
        raise HTTPException(status_code=409, detail="Já existe um backup em andamento.")

    background_tasks.add_task(executar_backup, "MANUAL")
    registrar_log(admin.id, "backup.disparar_manual", entidade="backups")
    return {"status": "iniciado"}


@router.get("/api/backups/{backup_id}/arquivo")
def baixar_backup(backup_id: str, admin: UsuarioAtual = Depends(require_admin)):
    row = fetch_one("SELECT status, arquivo_nome FROM backups WHERE id = %s;", (backup_id,))
    if not row or row["status"] != "SUCESSO" or not row["arquivo_nome"]:
        raise HTTPException(status_code=404, detail="Backup não encontrado ou sem arquivo disponível.")

    caminho = os.path.join(BACKUP_DIR, row["arquivo_nome"])
    if not os.path.exists(caminho):
        raise HTTPException(status_code=404, detail="Arquivo de backup não encontrado em disco.")

    registrar_log(admin.id, "backup.baixar", entidade="backups", entidade_id=backup_id)
    return FileResponse(caminho, media_type="application/octet-stream", filename=row["arquivo_nome"])
