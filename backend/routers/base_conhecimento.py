from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_pagina
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("base-conhecimento"))])

_QUERY = """
    SELECT k.id, k.titulo, k.categoria, k.conteudo, u.nome AS autor,
           k.created_at, k.updated_at, k.status, k.tags
    FROM base_conhecimento k
    LEFT JOIN usuarios u ON u.id = k.autor_id
    ORDER BY k.updated_at DESC;
"""


class ArtigoConhecimento(BaseModel):
    id: str
    titulo: str
    categoria: str
    conteudo: str
    autor: str
    criadoEm: str
    atualizadoEm: str
    status: str
    tags: list[str]


def _serialize(row: dict) -> ArtigoConhecimento:
    return ArtigoConhecimento(
        id=str(row["id"]),
        titulo=row["titulo"],
        categoria=row["categoria"],
        conteudo=row["conteudo"],
        autor=row["autor"] or "",
        criadoEm=row["created_at"].date().isoformat(),
        atualizadoEm=row["updated_at"].date().isoformat(),
        status=row["status"],
        tags=row["tags"] or [],
    )


@router.get("/api/base-conhecimento", response_model=list[ArtigoConhecimento])
def listar_artigos():
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]
