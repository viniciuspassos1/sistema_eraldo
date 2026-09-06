import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_STATUS_VALIDOS = {"AGENDADA", "EM_ANDAMENTO", "CONCLUIDA"}

_QUERY = """
    SELECT f.id, f.funcionario_id, u.nome AS funcionario_nome, f.inicio, f.fim, f.status, f.observacoes
    FROM ferias f
    JOIN usuarios u ON u.id = f.funcionario_id
    ORDER BY f.inicio;
"""


class Ferias(BaseModel):
    id: str
    funcionarioId: str
    funcionarioNome: str
    inicio: str
    fim: str
    status: str
    observacoes: str | None = None


def _serialize(row: dict) -> Ferias:
    return Ferias(
        id=str(row["id"]),
        funcionarioId=str(row["funcionario_id"]),
        funcionarioNome=row["funcionario_nome"],
        inicio=row["inicio"].isoformat(),
        fim=row["fim"].isoformat(),
        status=row["status"],
        observacoes=row["observacoes"],
    )


@router.get("/api/ferias", response_model=list[Ferias])
def listar_ferias(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]


class NovasFerias(BaseModel):
    funcionarioId: str
    inicio: str
    fim: str
    status: str = "AGENDADA"
    observacoes: str | None = None


def _buscar_por_id(ferias_id: str) -> dict:
    row = fetch_one(
        """
        SELECT f.id, f.funcionario_id, u.nome AS funcionario_nome, f.inicio, f.fim, f.status, f.observacoes
        FROM ferias f JOIN usuarios u ON u.id = f.funcionario_id
        WHERE f.id = %s;
        """,
        (ferias_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Período de férias não encontrado.")
    return row


@router.post("/api/ferias", response_model=Ferias, status_code=201)
def criar_ferias(body: NovasFerias, admin: UsuarioAtual = Depends(require_admin)):
    if body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ferias (funcionario_id, inicio, fim, status, observacoes)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.funcionarioId, body.inicio, body.fim, body.status, body.observacoes),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()
    registrar_log(admin.id, "ferias.criar", entidade="ferias", entidade_id=str(novo_id))
    return _serialize(_buscar_por_id(novo_id))


@router.put("/api/ferias/{ferias_id}", response_model=Ferias)
def editar_ferias(ferias_id: str, body: NovasFerias, admin: UsuarioAtual = Depends(require_admin)):
    if body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ferias SET funcionario_id = %s, inicio = %s, fim = %s, status = %s, observacoes = %s
                    WHERE id = %s;
                    """,
                    (body.funcionarioId, body.inicio, body.fim, body.status, body.observacoes, ferias_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Período de férias não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Período de férias não encontrado.")
    registrar_log(admin.id, "ferias.editar", entidade="ferias", entidade_id=ferias_id)
    return _serialize(_buscar_por_id(ferias_id))


@router.delete("/api/ferias/{ferias_id}", status_code=204)
def excluir_ferias(ferias_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM ferias WHERE id = %s;", (ferias_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Período de férias não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Período de férias não encontrado.")
    registrar_log(admin.id, "ferias.excluir", entidade="ferias", entidade_id=ferias_id)
