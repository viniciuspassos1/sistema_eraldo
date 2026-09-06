import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from security import require_api_key, require_admin, UsuarioAtual
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_admin)])

_COLUNAS = """
    l.id, l.usuario_id, u.nome AS usuario_nome, l.acao, l.entidade,
    l.entidade_id, l.detalhes, l.criado_em
"""


class LogAuditoria(BaseModel):
    id: str
    usuarioId: str | None = None
    usuarioNome: str | None = None
    acao: str
    entidade: str | None = None
    entidadeId: str | None = None
    detalhes: dict | None = None
    criadoEm: str


def _serialize(row: dict) -> LogAuditoria:
    return LogAuditoria(
        id=str(row["id"]),
        usuarioId=str(row["usuario_id"]) if row["usuario_id"] else None,
        usuarioNome=row["usuario_nome"],
        acao=row["acao"],
        entidade=row["entidade"],
        entidadeId=row["entidade_id"],
        detalhes=row["detalhes"],
        criadoEm=row["criado_em"].isoformat(),
    )


@router.get("/api/logs", response_model=list[LogAuditoria])
def listar_logs(
    usuarioId: str | None = Query(default=None),
    acao: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    _admin: UsuarioAtual = Depends(require_admin),
):
    condicoes = []
    params: list = []

    if usuarioId:
        condicoes.append("l.usuario_id = %s")
        params.append(usuarioId)
    if acao:
        condicoes.append("l.acao ILIKE %s")
        params.append(f"%{acao}%")

    where = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
    params.extend([limit, offset])

    try:
        rows = fetch_all(
            f"""
            SELECT {_COLUNAS}
            FROM logs_auditoria l
            LEFT JOIN usuarios u ON u.id = l.usuario_id
            {where}
            ORDER BY l.criado_em DESC
            LIMIT %s OFFSET %s;
            """,
            tuple(params),
        )
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=400, detail="usuarioId inválido.")
    return [_serialize(r) for r in rows]
