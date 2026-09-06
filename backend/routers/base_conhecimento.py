import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_pagina, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("base-conhecimento"))])

_STATUS_VALIDOS = {"PUBLICADO", "RASCUNHO"}

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


class NovoArtigo(BaseModel):
    titulo: str
    categoria: str
    conteudo: str
    status: str = "RASCUNHO"
    tags: list[str] = []


def _validar_artigo(body: NovoArtigo) -> None:
    if body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")
    if not body.titulo.strip() or not body.conteudo.strip():
        raise HTTPException(status_code=400, detail="Título e conteúdo são obrigatórios.")


def _buscar_por_id(artigo_id: str) -> dict:
    row = fetch_one(
        """
        SELECT k.id, k.titulo, k.categoria, k.conteudo, u.nome AS autor,
               k.created_at, k.updated_at, k.status, k.tags
        FROM base_conhecimento k LEFT JOIN usuarios u ON u.id = k.autor_id
        WHERE k.id = %s;
        """,
        (artigo_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Artigo não encontrado.")
    return row


@router.post("/api/base-conhecimento", response_model=ArtigoConhecimento, status_code=201)
def criar_artigo(body: NovoArtigo, admin: UsuarioAtual = Depends(require_admin)):
    _validar_artigo(body)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO base_conhecimento (titulo, categoria, conteudo, autor_id, status, tags)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.titulo.strip(), body.categoria.strip(), body.conteudo.strip(), admin.id, body.status, body.tags),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()

    registrar_log(admin.id, "base_conhecimento.criar", entidade="base_conhecimento", entidade_id=str(novo_id))
    return _serialize(_buscar_por_id(novo_id))


@router.put("/api/base-conhecimento/{artigo_id}", response_model=ArtigoConhecimento)
def editar_artigo(artigo_id: str, body: NovoArtigo, admin: UsuarioAtual = Depends(require_admin)):
    _validar_artigo(body)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE base_conhecimento
                    SET titulo = %s, categoria = %s, conteudo = %s, status = %s, tags = %s, updated_at = now()
                    WHERE id = %s;
                    """,
                    (body.titulo.strip(), body.categoria.strip(), body.conteudo.strip(), body.status, body.tags, artigo_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Artigo não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Artigo não encontrado.")

    registrar_log(admin.id, "base_conhecimento.editar", entidade="base_conhecimento", entidade_id=artigo_id)
    return _serialize(_buscar_por_id(artigo_id))


@router.delete("/api/base-conhecimento/{artigo_id}", status_code=204)
def excluir_artigo(artigo_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM base_conhecimento WHERE id = %s;", (artigo_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Artigo não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Artigo não encontrado.")

    registrar_log(admin.id, "base_conhecimento.excluir", entidade="base_conhecimento", entidade_id=artigo_id)
