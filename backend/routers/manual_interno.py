from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key)])


class Capitulo(BaseModel):
    titulo: str
    conteudo: str


def _serialize(row: dict) -> Capitulo:
    return Capitulo(titulo=row["titulo"], conteudo=row["conteudo"])


@router.get("/api/manual-interno", response_model=list[Capitulo])
def listar_capitulos():
    rows = fetch_all("SELECT titulo, conteudo FROM manual_interno_capitulos ORDER BY ordem;")
    return [_serialize(r) for r in rows]
