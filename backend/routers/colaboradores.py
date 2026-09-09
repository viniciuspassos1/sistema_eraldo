"""Cadastro de colaboradores para a aba "Aniversariantes" — separado da conta
de login (`usuarios`) porque nem todo colaborador tem acesso ao sistema, e no
início do cadastro real da equipe sabe-se o nome e o aniversário de cada
pessoa, mas não necessariamente o nome completo ainda."""

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_QUERY = """
    SELECT id, nome, nome_completo, aniversario, restricao_alimentar, papel
    FROM colaboradores
    ORDER BY nome;
"""

_PAPEIS_VALIDOS = {"ADMINISTRADOR", "COLABORADOR"}


class Colaborador(BaseModel):
    id: str
    nome: str
    nomeCompleto: str | None = None
    aniversario: str
    restricaoAlimentar: str | None = None
    papel: str


def _serialize(row: dict) -> Colaborador:
    return Colaborador(
        id=str(row["id"]),
        nome=row["nome"],
        nomeCompleto=row["nome_completo"],
        aniversario=row["aniversario"].isoformat(),
        restricaoAlimentar=row["restricao_alimentar"],
        papel=row["papel"],
    )


@router.get("/api/colaboradores", response_model=list[Colaborador])
def listar_colaboradores(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]


class ColaboradorInput(BaseModel):
    nome: str
    nomeCompleto: str | None = None
    aniversario: str
    restricaoAlimentar: str | None = None
    papel: str = "COLABORADOR"


def _buscar_por_id(colaborador_id: str) -> dict:
    row = fetch_one(
        """
        SELECT id, nome, nome_completo, aniversario, restricao_alimentar, papel
        FROM colaboradores WHERE id = %s;
        """,
        (colaborador_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado.")
    return row


@router.post("/api/colaboradores", response_model=Colaborador, status_code=201)
def criar_colaborador(body: ColaboradorInput, admin: UsuarioAtual = Depends(require_admin)):
    if body.papel not in _PAPEIS_VALIDOS:
        raise HTTPException(status_code=400, detail="Papel inválido.")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO colaboradores (nome, nome_completo, aniversario, restricao_alimentar, papel)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.nome, body.nomeCompleto, body.aniversario, body.restricaoAlimentar, body.papel),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()
    registrar_log(admin.id, "colaboradores.criar", entidade="colaboradores", entidade_id=str(novo_id))
    return _serialize(_buscar_por_id(novo_id))


@router.put("/api/colaboradores/{colaborador_id}", response_model=Colaborador)
def editar_colaborador(colaborador_id: str, body: ColaboradorInput, admin: UsuarioAtual = Depends(require_admin)):
    if body.papel not in _PAPEIS_VALIDOS:
        raise HTTPException(status_code=400, detail="Papel inválido.")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE colaboradores
                    SET nome = %s, nome_completo = %s, aniversario = %s, restricao_alimentar = %s, papel = %s, updated_at = now()
                    WHERE id = %s;
                    """,
                    (body.nome, body.nomeCompleto, body.aniversario, body.restricaoAlimentar, body.papel, colaborador_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Colaborador não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado.")
    registrar_log(admin.id, "colaboradores.editar", entidade="colaboradores", entidade_id=colaborador_id)
    return _serialize(_buscar_por_id(colaborador_id))


@router.delete("/api/colaboradores/{colaborador_id}", status_code=204)
def excluir_colaborador(colaborador_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM colaboradores WHERE id = %s;", (colaborador_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Colaborador não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado.")
    registrar_log(admin.id, "colaboradores.excluir", entidade="colaboradores", entidade_id=colaborador_id)
