from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_pagina
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("tribunais"))])


class Tribunal(BaseModel):
    id: str
    nome: str
    descricao: str
    url: str
    categoria: str


def _serialize(row: dict) -> Tribunal:
    return Tribunal(
        id=str(row["id"]),
        nome=row["nome"],
        descricao=row["descricao"],
        url=row["url"],
        categoria=row["categoria"],
    )


@router.get("/api/tribunais", response_model=list[Tribunal])
def listar_tribunais():
    rows = fetch_all("SELECT id, nome, descricao, url, categoria FROM tribunais ORDER BY categoria, nome;")
    return [_serialize(r) for r in rows]
