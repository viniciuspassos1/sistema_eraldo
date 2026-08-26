from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, nome, data_inicio, data_fim, tipo, escritorio_fechado, observacao"


class Feriado(BaseModel):
    id: str
    nome: str
    dataInicio: str
    dataFim: str | None = None
    tipo: str
    escritorioFechado: bool
    observacao: str | None = None


def _serialize(row: dict) -> Feriado:
    return Feriado(
        id=str(row["id"]),
        nome=row["nome"],
        dataInicio=row["data_inicio"].isoformat(),
        dataFim=row["data_fim"].isoformat() if row["data_fim"] else None,
        tipo=row["tipo"],
        escritorioFechado=row["escritorio_fechado"],
        observacao=row["observacao"],
    )


@router.get("/api/feriados", response_model=list[Feriado])
def listar_feriados():
    rows = fetch_all(f"SELECT {_COLUNAS} FROM feriados ORDER BY data_inicio;")
    return [_serialize(r) for r in rows]
