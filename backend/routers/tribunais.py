import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_pagina, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

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


class NovoTribunal(BaseModel):
    nome: str
    descricao: str
    url: str
    categoria: str


@router.post("/api/tribunais", response_model=Tribunal, status_code=201)
def criar_tribunal(body: NovoTribunal, admin: UsuarioAtual = Depends(require_admin)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO tribunais (nome, descricao, url, categoria) VALUES (%s, %s, %s, %s) RETURNING id;",
                (body.nome.strip(), body.descricao.strip(), body.url.strip(), body.categoria.strip()),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()
    registrar_log(admin.id, "tribunal.criar", entidade="tribunais", entidade_id=str(novo_id))
    row = fetch_one("SELECT id, nome, descricao, url, categoria FROM tribunais WHERE id = %s;", (novo_id,))
    return _serialize(row)


@router.put("/api/tribunais/{tribunal_id}", response_model=Tribunal)
def editar_tribunal(tribunal_id: str, body: NovoTribunal, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tribunais SET nome = %s, descricao = %s, url = %s, categoria = %s WHERE id = %s;",
                    (body.nome.strip(), body.descricao.strip(), body.url.strip(), body.categoria.strip(), tribunal_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Tribunal não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Tribunal não encontrado.")
    registrar_log(admin.id, "tribunal.editar", entidade="tribunais", entidade_id=tribunal_id)
    row = fetch_one("SELECT id, nome, descricao, url, categoria FROM tribunais WHERE id = %s;", (tribunal_id,))
    return _serialize(row)


@router.delete("/api/tribunais/{tribunal_id}", status_code=204)
def excluir_tribunal(tribunal_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM tribunais WHERE id = %s;", (tribunal_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Tribunal não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Tribunal não encontrado.")
    registrar_log(admin.id, "tribunal.excluir", entidade="tribunais", entidade_id=tribunal_id)
