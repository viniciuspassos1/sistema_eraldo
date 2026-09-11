"""Central de Ajuda — chatbot de perguntas prontas. Cada pergunta é ligada
a um artigo da Base de Conhecimento; a "resposta" é sempre o conteúdo desse
artigo, nunca texto gerado — não existe busca semântica nem LLM aqui."""

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, require_pagina, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log, registrar_edicao

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("assistente-ia"))])

_COLUNAS = "id, pergunta, categoria, documento_id, ordem, ativo"


class Pergunta(BaseModel):
    id: str
    pergunta: str
    categoria: str
    documentoId: str | None = None
    ordem: int
    ativo: bool


class Resposta(BaseModel):
    documentoEncontrado: bool
    titulo: str | None = None
    categoria: str | None = None
    conteudo: str | None = None


class PerguntaComResposta(Pergunta):
    resposta: Resposta


class NovaPergunta(BaseModel):
    pergunta: str
    categoria: str
    documentoId: str
    ordem: int = 0
    ativo: bool = True


def _serialize(row: dict) -> Pergunta:
    return Pergunta(
        id=str(row["id"]),
        pergunta=row["pergunta"],
        categoria=row["categoria"],
        documentoId=str(row["documento_id"]) if row["documento_id"] else None,
        ordem=row["ordem"],
        ativo=row["ativo"],
    )


def _buscar_por_id(pergunta_id: str) -> dict:
    row = fetch_one(f"SELECT {_COLUNAS} FROM chatbot_perguntas WHERE id = %s;", (pergunta_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada.")
    return row


def _validar_documento(documento_id: str) -> None:
    if not fetch_one("SELECT id FROM base_conhecimento WHERE id = %s;", (documento_id,)):
        raise HTTPException(status_code=400, detail="Documento da Base de Conhecimento não encontrado.")


@router.get("/api/chatbot/perguntas", response_model=list[Pergunta])
def listar_perguntas(usuario: UsuarioAtual = Depends(require_user)):
    query = f"SELECT {_COLUNAS} FROM chatbot_perguntas"
    if usuario.perfil != "ADMINISTRADOR":
        query += " WHERE ativo = true"
    query += " ORDER BY categoria, ordem;"
    rows = fetch_all(query)
    return [_serialize(r) for r in rows]


@router.get("/api/chatbot/perguntas/{pergunta_id}", response_model=PerguntaComResposta)
def obter_pergunta(pergunta_id: str, usuario: UsuarioAtual = Depends(require_user)):
    try:
        row = _buscar_por_id(pergunta_id)
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada.")

    if not row["ativo"] and usuario.perfil != "ADMINISTRADOR":
        raise HTTPException(status_code=404, detail="Pergunta não encontrada.")

    documento = None
    if row["documento_id"]:
        documento = fetch_one(
            "SELECT titulo, categoria, conteudo FROM base_conhecimento WHERE id = %s;",
            (row["documento_id"],),
        )

    resposta = (
        Resposta(documentoEncontrado=True, titulo=documento["titulo"], categoria=documento["categoria"], conteudo=documento["conteudo"])
        if documento
        else Resposta(documentoEncontrado=False)
    )
    return PerguntaComResposta(**_serialize(row).model_dump(), resposta=resposta)


@router.post("/api/chatbot/perguntas", response_model=Pergunta, status_code=201)
def criar_pergunta(body: NovaPergunta, admin: UsuarioAtual = Depends(require_admin)):
    if not body.pergunta.strip() or not body.categoria.strip():
        raise HTTPException(status_code=400, detail="Pergunta e categoria são obrigatórias.")
    _validar_documento(body.documentoId)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO chatbot_perguntas (pergunta, categoria, documento_id, ordem, ativo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.pergunta.strip(), body.categoria.strip(), body.documentoId, body.ordem, body.ativo),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()

    registrar_log(admin.id, "chatbot_pergunta.criar", entidade="chatbot_perguntas", entidade_id=str(novo_id))
    return _serialize(_buscar_por_id(novo_id))


@router.put("/api/chatbot/perguntas/{pergunta_id}", response_model=Pergunta)
def editar_pergunta(pergunta_id: str, body: NovaPergunta, admin: UsuarioAtual = Depends(require_admin)):
    if not body.pergunta.strip() or not body.categoria.strip():
        raise HTTPException(status_code=400, detail="Pergunta e categoria são obrigatórias.")
    _validar_documento(body.documentoId)

    try:
        anterior = _buscar_por_id(pergunta_id)
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE chatbot_perguntas
                    SET pergunta = %s, categoria = %s, documento_id = %s, ordem = %s, ativo = %s, updated_at = now()
                    WHERE id = %s;
                    """,
                    (body.pergunta.strip(), body.categoria.strip(), body.documentoId, body.ordem, body.ativo, pergunta_id),
                )
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada.")

    registrar_edicao(
        admin.id,
        "chatbot_pergunta.editar",
        "chatbot_perguntas",
        pergunta_id,
        anterior=_serialize(anterior).model_dump(),
        novo=body.model_dump(),
    )
    return _serialize(_buscar_por_id(pergunta_id))


@router.delete("/api/chatbot/perguntas/{pergunta_id}", status_code=204)
def excluir_pergunta(pergunta_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM chatbot_perguntas WHERE id = %s;", (pergunta_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Pergunta não encontrada.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada.")

    registrar_log(admin.id, "chatbot_pergunta.excluir", entidade="chatbot_perguntas", entidade_id=pergunta_id)
