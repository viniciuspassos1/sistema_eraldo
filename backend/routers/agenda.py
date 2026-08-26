from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key)])

_QUERY = """
    SELECT e.id, e.titulo, e.tipo, e.data, e.horario, u.nome AS responsavel, e.local, e.observacoes
    FROM agenda_eventos e
    LEFT JOIN usuarios u ON u.id = e.responsavel_id
    ORDER BY e.data, e.horario;
"""


class AgendaEvento(BaseModel):
    id: str
    titulo: str
    tipo: str
    data: str
    horario: str
    responsavel: str
    local: str | None = None
    observacoes: str | None = None


def _serialize(row: dict) -> AgendaEvento:
    return AgendaEvento(
        id=str(row["id"]),
        titulo=row["titulo"],
        tipo=row["tipo"],
        data=row["data"].isoformat(),
        horario=row["horario"].isoformat(timespec="minutes"),
        responsavel=row["responsavel"] or "",
        local=row["local"],
        observacoes=row["observacoes"],
    )


@router.get("/api/agenda/eventos", response_model=list[AgendaEvento])
def listar_eventos():
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]
