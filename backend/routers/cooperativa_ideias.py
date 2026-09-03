import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_pagina, UsuarioAtual
from database import fetch_all, get_connection
from llm import gerar_texto

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("cooperativa-ideias"))])

_STATUS_VALIDOS = {"NOVA", "EM_ANALISE", "APROVADA", "EM_PRODUCAO", "PUBLICADA", "NAO_APROVADA"}

_INSTRUCAO_REDIGIR = (
    "Você ajuda a equipe de marketing de um escritório de advocacia brasileiro a "
    "detalhar ideias de conteúdo para redes sociais. Dado um título, formato e tema, "
    "escreva uma descrição objetiva (3 a 5 frases) explicando a ideia, o gancho e o "
    "público-alvo. Responda em português do Brasil, devolva só a descrição pronta, "
    "sem introduções nem explicações sobre o que você fez."
)

_SELECT = """
    SELECT i.id, i.titulo, i.descricao, i.formato, i.tema, i.referencia,
           u.nome AS autor, i.data, i.status
    FROM cooperativa_ideias i
    LEFT JOIN usuarios u ON u.id = i.autor_id
"""


class Ideia(BaseModel):
    id: str
    titulo: str
    descricao: str
    formato: str
    tema: str
    referencia: str | None = None
    autor: str
    data: str
    status: str


class NovaIdeia(BaseModel):
    titulo: str
    descricao: str
    formato: str
    tema: str
    referencia: str | None = None


class AtualizarStatus(BaseModel):
    status: str


def _serialize(row: dict) -> Ideia:
    return Ideia(
        id=str(row["id"]),
        titulo=row["titulo"],
        descricao=row["descricao"],
        formato=row["formato"],
        tema=row["tema"],
        referencia=row["referencia"],
        autor=row["autor"] or "",
        data=row["data"].isoformat(),
        status=row["status"],
    )


@router.get("/api/cooperativa-ideias", response_model=list[Ideia])
def listar_ideias():
    rows = fetch_all(_SELECT + " ORDER BY i.data DESC;")
    return [_serialize(r) for r in rows]


@router.post("/api/cooperativa-ideias", response_model=Ideia, status_code=201)
def criar_ideia(body: NovaIdeia, usuario: UsuarioAtual = Depends(require_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cooperativa_ideias (titulo, descricao, formato, tema, referencia, autor_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.titulo, body.descricao, body.formato, body.tema, body.referencia, usuario.id),
            )
            nova_id = cur.fetchone()["id"]
        conn.commit()

        with conn.cursor() as cur:
            cur.execute(_SELECT + " WHERE i.id = %s;", (nova_id,))
            row = cur.fetchone()

    return _serialize(row)


class RedigirRequest(BaseModel):
    titulo: str
    formato: str
    tema: str


class RedigirResponse(BaseModel):
    descricaoSugerida: str


@router.post("/api/cooperativa-ideias/redigir", response_model=RedigirResponse)
def redigir_ideia(body: RedigirRequest, _usuario: UsuarioAtual = Depends(require_user)) -> RedigirResponse:
    prompt = f"Título: {body.titulo}\nFormato: {body.formato}\nTema: {body.tema}"
    descricao = gerar_texto(prompt, _INSTRUCAO_REDIGIR)
    return RedigirResponse(descricaoSugerida=descricao)


@router.patch("/api/cooperativa-ideias/{ideia_id}", response_model=Ideia)
def atualizar_status(ideia_id: str, body: AtualizarStatus):
    if body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE cooperativa_ideias SET status = %s, updated_at = now() WHERE id = %s;",
                    (body.status, ideia_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Ideia não encontrada.")
            conn.commit()

            with conn.cursor() as cur:
                cur.execute(_SELECT + " WHERE i.id = %s;", (ideia_id,))
                row = cur.fetchone()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Ideia não encontrada.")

    return _serialize(row)
