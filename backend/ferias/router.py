from fastapi import APIRouter, Header
from pydantic import BaseModel

from security import require_api_key
from database import get_connection

router = APIRouter()

_QUERY = """
    SELECT f.id, f.funcionario_id, u.nome AS funcionario_nome, f.inicio, f.fim, f.status, f.observacoes
    FROM ferias f
    JOIN usuarios u ON u.id = f.funcionario_id
    ORDER BY f.inicio;
"""


class Ferias(BaseModel):
    id: str
    funcionarioId: str
    funcionarioNome: str
    inicio: str
    fim: str
    status: str
    observacoes: str | None = None


def _serialize(row: dict) -> Ferias:
    return Ferias(
        id=str(row["id"]),
        funcionarioId=str(row["funcionario_id"]),
        funcionarioNome=row["funcionario_nome"],
        inicio=row["inicio"].isoformat(),
        fim=row["fim"].isoformat(),
        status=row["status"],
        observacoes=row["observacoes"],
    )


@router.get("/api/ferias", response_model=list[Ferias])
def listar_ferias(x_api_key: str | None = Header(default=None)):
    require_api_key(x_api_key)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(_QUERY)
            rows = cur.fetchall()
        return [_serialize(r) for r in rows]
    finally:
        conn.close()
