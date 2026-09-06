import re

import psycopg2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from security import require_api_key, require_pagina, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("documentos"))])

_STATUS_VALIDOS = {"PUBLICADO", "RASCUNHO"}
_TIPOS_PERMITIDOS = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
}


def _nome_seguro(nome: str) -> str:
    limpo = re.sub(r'[\r\n"]', "", nome)
    return limpo[:255] or "documento"

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


@router.post("/api/documentos", response_model=DocumentoItem, status_code=201)
async def criar_documento(
    titulo: str = Form(...),
    categoria: str = Form(...),
    tags: str = Form(""),  # CSV simples vindo do form ("financeiro,contrato")
    status: str = Form("RASCUNHO"),
    arquivo: UploadFile = File(...),
    admin: UsuarioAtual = Depends(require_admin),
):
    if status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")
    if arquivo.content_type not in _TIPOS_PERMITIDOS:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido.")

    conteudo = await arquivo.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(conteudo) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo maior que 15 MB.")

    lista_tags = [t.strip() for t in tags.split(",") if t.strip()]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO documentos
                    (titulo, categoria, autor_id, tags, status, tamanho_bytes, arquivo_tipo, arquivo_dados)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    titulo.strip(),
                    categoria.strip(),
                    admin.id,
                    lista_tags,
                    status,
                    len(conteudo),
                    arquivo.content_type,
                    conteudo,
                ),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()

    registrar_log(admin.id, "documento.criar", entidade="documentos", entidade_id=str(novo_id))

    row = fetch_one(
        """
        SELECT d.id, d.titulo, d.categoria, u.nome AS autor, d.data, d.atualizado_em,
               d.tags, d.status, d.tamanho_bytes
        FROM documentos d LEFT JOIN usuarios u ON u.id = d.autor_id
        WHERE d.id = %s;
        """,
        (novo_id,),
    )
    return _serialize(row)


@router.get("/api/documentos/{documento_id}/arquivo")
def baixar_documento(documento_id: str):
    try:
        row = fetch_one(
            "SELECT titulo, arquivo_tipo, arquivo_dados FROM documentos WHERE id = %s;",
            (documento_id,),
        )
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    if not row or not row["arquivo_dados"]:
        raise HTTPException(status_code=404, detail="Este documento não tem arquivo anexado.")

    return Response(
        content=bytes(row["arquivo_dados"]),
        media_type=row["arquivo_tipo"] or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{_nome_seguro(row["titulo"])}"'},
    )


@router.delete("/api/documentos/{documento_id}", status_code=204)
def excluir_documento(documento_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM documentos WHERE id = %s;", (documento_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Documento não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    registrar_log(admin.id, "documento.excluir", entidade="documentos", entidade_id=documento_id)
