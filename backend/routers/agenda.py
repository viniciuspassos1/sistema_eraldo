from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key)])

_QUERY_BASE = """
    SELECT e.id, e.titulo, e.tipo, e.data, e.horario, u.nome AS responsavel, e.local, e.observacoes
    FROM agenda_eventos e
    LEFT JOIN usuarios u ON u.id = e.responsavel_id
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
def listar_eventos(usuario: UsuarioAtual = Depends(require_user)):
    """Cada funcionário só vê os compromissos oficiais em que é o
    responsável (mais os sem responsável definido, que valem pro escritório
    inteiro). Administrador vê tudo, pra coordenação geral da agenda."""
    if usuario.perfil == "ADMINISTRADOR":
        rows = fetch_all(_QUERY_BASE + " ORDER BY e.data, e.horario;")
    else:
        rows = fetch_all(
            _QUERY_BASE + " WHERE e.responsavel_id = %s OR e.responsavel_id IS NULL ORDER BY e.data, e.horario;",
            (usuario.id,),
        )
    return [_serialize(r) for r in rows]
