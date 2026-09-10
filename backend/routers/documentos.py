import re

import psycopg2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from security import require_api_key, require_pagina, require_admin, require_user, UsuarioAtual
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
# Rótulo legível do formato pra auditoria ("Documento inserido" na tela de
# Logs) — o content-type puro (ex.: "application/vnd.openxml...") não diz
# nada de útil pra quem está revisando o histórico.
_TIPO_LABEL = {
    "application/pdf": "PDF",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
    "application/vnd.ms-excel": "Excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "image/jpeg": "Imagem (JPEG)",
    "image/png": "Imagem (PNG)",
    "image/webp": "Imagem (WEBP)",
}


def _nome_seguro(nome: str) -> str:
    limpo = re.sub(r'[\r\n"]', "", nome)
    return limpo[:255] or "documento"

_SELECT_BASE = """
    SELECT d.id, d.titulo, d.categoria, u.nome AS autor, d.data, d.atualizado_em,
           d.tags, d.status, d.tamanho_bytes
    FROM documentos d
    LEFT JOIN usuarios u ON u.id = d.autor_id
"""
_QUERY = _SELECT_BASE + " ORDER BY d.atualizado_em DESC;"
_QUERY_PUBLICADOS = _SELECT_BASE + " WHERE d.status = 'PUBLICADO' ORDER BY d.atualizado_em DESC;"


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
def listar_documentos(usuario: UsuarioAtual = Depends(require_user)):
    # Rascunho é conteúdo em elaboração — só quem pode publicar (admin) o vê
    # antes da hora; pra todo mundo com acesso à página, só o já publicado.
    query = _QUERY if usuario.perfil == "ADMINISTRADOR" else _QUERY_PUBLICADOS
    rows = fetch_all(query)
    return [_serialize(r) for r in rows]


def _detalhes_documento(titulo: str, content_type: str | None, tamanho_bytes: int | None) -> dict:
    return {
        "documentoNome": titulo,
        "documentoTipo": _TIPO_LABEL.get(content_type or "", content_type or "desconhecido"),
        "tamanhoBytes": tamanho_bytes,
    }


@router.post("/api/documentos", response_model=DocumentoItem, status_code=201)
async def criar_documento(
    titulo: str = Form(...),
    categoria: str = Form(...),
    tags: str = Form(""),  # CSV simples vindo do form ("financeiro,contrato")
    status: str = Form("RASCUNHO"),
    arquivo: UploadFile = File(...),
    admin: UsuarioAtual = Depends(require_admin),
):
    # Toda rejeição abaixo também vira log (status=ERRO) — auditoria de
    # documentos cobre tentativas que falharam, não só o que deu certo (ver
    # "Auditoria de Logs" no pedido: rastrear quem tentou inserir o quê e o
    # resultado, sucesso ou erro).
    def _log_erro(motivo: str) -> None:
        registrar_log(
            admin.id, "documento.criar", entidade="documentos",
            detalhes={**_detalhes_documento(titulo.strip() if titulo else "", arquivo.content_type, None), "erro": motivo},
            status="ERRO",
        )

    if status not in _STATUS_VALIDOS:
        _log_erro("Status inválido.")
        raise HTTPException(status_code=400, detail="Status inválido.")
    if arquivo.content_type not in _TIPOS_PERMITIDOS:
        _log_erro("Tipo de arquivo não permitido.")
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido.")

    conteudo = await arquivo.read()
    if not conteudo:
        _log_erro("Arquivo vazio.")
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(conteudo) > 15 * 1024 * 1024:
        _log_erro("Arquivo maior que 15 MB.")
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

    registrar_log(
        admin.id, "documento.criar", entidade="documentos", entidade_id=str(novo_id),
        detalhes=_detalhes_documento(titulo.strip(), arquivo.content_type, len(conteudo)),
    )

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
def baixar_documento(documento_id: str, usuario: UsuarioAtual = Depends(require_user)):
    try:
        row = fetch_one(
            "SELECT titulo, status, arquivo_tipo, arquivo_dados FROM documentos WHERE id = %s;",
            (documento_id,),
        )
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    if not row or not row["arquivo_dados"]:
        raise HTTPException(status_code=404, detail="Este documento não tem arquivo anexado.")
    if row["status"] != "PUBLICADO" and usuario.perfil != "ADMINISTRADOR":
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    return Response(
        content=bytes(row["arquivo_dados"]),
        media_type=row["arquivo_tipo"] or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{_nome_seguro(row["titulo"])}"'},
    )


@router.delete("/api/documentos/{documento_id}", status_code=204)
def excluir_documento(documento_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        # Busca nome/tipo ANTES de apagar — depois do DELETE não tem mais
        # como saber qual documento era, e a auditoria precisa registrar
        # isso mesmo assim.
        existente = fetch_one("SELECT titulo, arquivo_tipo, tamanho_bytes FROM documentos WHERE id = %s;", (documento_id,))

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM documentos WHERE id = %s;", (documento_id,))
                if cur.rowcount == 0:
                    registrar_log(
                        admin.id, "documento.excluir", entidade="documentos", entidade_id=documento_id,
                        detalhes={"erro": "Documento não encontrado."}, status="ERRO",
                    )
                    raise HTTPException(status_code=404, detail="Documento não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    detalhes = _detalhes_documento(existente["titulo"], existente["arquivo_tipo"], existente["tamanho_bytes"]) if existente else None
    registrar_log(admin.id, "documento.excluir", entidade="documentos", entidade_id=documento_id, detalhes=detalhes)
