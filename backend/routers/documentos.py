from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_pagina
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("documentos"))])

_QUERY = """
    SELECT d.id, d.titulo, d.categoria, u.nome AS autor, d.data, d.atualizado_em,
           d.tags, d.status, d.tamanho_bytes
    FROM documentos d
    LEFT JOIN usuarios u ON u.id = d.autor_id
    ORDER BY d.atualizado_em DESC;
"""


class DocumentoItem(BaseModel):
    id: str
    titulo: str
    categoria: str
    autor: str
    data: str
    atualizadoEm: str
    tags: list[str]
    status: str
    tamanho: str


def _formatar_tamanho(num_bytes: int | None) -> str:
    if not num_bytes:
        return "—"
    kb = num_bytes / 1024
    if kb < 1024:
        return f"{kb:.0f} KB"
    return f"{kb / 1024:.1f} MB"


def _serialize(row: dict) -> DocumentoItem:
    return DocumentoItem(
        id=str(row["id"]),
        titulo=row["titulo"],
        categoria=row["categoria"],
        autor=row["autor"] or "",
        data=row["data"].isoformat(),
        atualizadoEm=row["atualizado_em"].date().isoformat(),
        tags=row["tags"] or [],
        status=row["status"],
        tamanho=_formatar_tamanho(row["tamanho_bytes"]),
    )


@router.get("/api/documentos", response_model=list[DocumentoItem])
def listar_documentos():
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]
