"""Bloco de notas pessoal — espaço livre pra lembrete/observação avulsa, sem
data ou horário vinculado (diferente de agenda_anotacoes, presa à grade da
Agenda). Cada pessoa só acessa as próprias notas."""

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, titulo, conteudo, updated_at"


class Nota(BaseModel):
    id: str
    titulo: str
    conteudo: str
    atualizadoEm: str


class NovaNota(BaseModel):
    titulo: str
    conteudo: str


class AtualizarNota(BaseModel):
    titulo: str
    conteudo: str


def _serialize(row: dict) -> Nota:
    return Nota(
        id=str(row["id"]),
        titulo=row["titulo"],
        conteudo=row["conteudo"],
        atualizadoEm=row["updated_at"].isoformat(),
    )


@router.get("/api/notas-pessoais", response_model=list[Nota])
def listar_notas(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(
        f"SELECT {_COLUNAS} FROM notas_pessoais WHERE usuario_id = %s ORDER BY updated_at DESC;",
        (usuario.id,),
    )
    return [_serialize(r) for r in rows]


@router.post("/api/notas-pessoais", response_model=Nota, status_code=201)
def criar_nota(body: NovaNota, usuario: UsuarioAtual = Depends(require_user)):
    titulo = body.titulo.strip()
    conteudo = body.conteudo.strip()
    if not titulo or not conteudo:
        raise HTTPException(status_code=400, detail="Título e conteúdo não podem ficar vazios.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO notas_pessoais (usuario_id, titulo, conteudo)
                VALUES (%s, %s, %s)
                RETURNING {_COLUNAS};
                """,
                (usuario.id, titulo, conteudo),
            )
            row = cur.fetchone()
        conn.commit()

    return _serialize(row)


@router.put("/api/notas-pessoais/{nota_id}", response_model=Nota)
def atualizar_nota(nota_id: str, body: AtualizarNota, usuario: UsuarioAtual = Depends(require_user)):
    titulo = body.titulo.strip()
    conteudo = body.conteudo.strip()
    if not titulo or not conteudo:
        raise HTTPException(status_code=400, detail="Título e conteúdo não podem ficar vazios.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE notas_pessoais SET titulo = %s, conteudo = %s, updated_at = now()
                    WHERE id = %s AND usuario_id = %s
                    RETURNING {_COLUNAS};
                    """,
                    (titulo, conteudo, nota_id, usuario.id),
                )
                row = cur.fetchone()
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Anotação não encontrada.")

    if not row:
        raise HTTPException(status_code=404, detail="Anotação não encontrada.")
    return _serialize(row)


@router.delete("/api/notas-pessoais/{nota_id}", status_code=204)
def apagar_nota(nota_id: str, usuario: UsuarioAtual = Depends(require_user)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM notas_pessoais WHERE id = %s AND usuario_id = %s;",
                    (nota_id, usuario.id),
                )
                encontrada = cur.rowcount > 0
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Anotação não encontrada.")

    if not encontrada:
        raise HTTPException(status_code=404, detail="Anotação não encontrada.")
