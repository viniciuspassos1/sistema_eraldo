from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key)])

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
def listar_ferias(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]
