import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, nome, data_inicio, data_fim, tipo, escritorio_fechado, observacao"
_TIPOS_VALIDOS = {"FERIADO", "RECESSO"}


class Feriado(BaseModel):
    id: str
    nome: str
    dataInicio: str
    dataFim: str | None = None
    tipo: str
    escritorioFechado: bool
    observacao: str | None = None


def _serialize(row: dict) -> Feriado:
    return Feriado(
        id=str(row["id"]),
        nome=row["nome"],
        dataInicio=row["data_inicio"].isoformat(),
        dataFim=row["data_fim"].isoformat() if row["data_fim"] else None,
        tipo=row["tipo"],
        escritorioFechado=row["escritorio_fechado"],
        observacao=row["observacao"],
    )


@router.get("/api/feriados", response_model=list[Feriado])
def listar_feriados(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(f"SELECT {_COLUNAS} FROM feriados ORDER BY data_inicio;")
    return [_serialize(r) for r in rows]


class NovoFeriado(BaseModel):
    nome: str
    dataInicio: str
    dataFim: str | None = None
    tipo: str = "FERIADO"
    escritorioFechado: bool = True
    observacao: str | None = None


def _validar_feriado(body: NovoFeriado) -> None:
    if body.tipo not in _TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo inválido.")


@router.post("/api/feriados", response_model=Feriado, status_code=201)
def criar_feriado(body: NovoFeriado, admin: UsuarioAtual = Depends(require_admin)):
    _validar_feriado(body)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO feriados (nome, data_inicio, data_fim, tipo, escritorio_fechado, observacao)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.nome.strip(), body.dataInicio, body.dataFim, body.tipo, body.escritorioFechado, body.observacao),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()
    registrar_log(admin.id, "feriado.criar", entidade="feriados", entidade_id=str(novo_id))
    row = fetch_one(f"SELECT {_COLUNAS} FROM feriados WHERE id = %s;", (novo_id,))
    return _serialize(row)


@router.put("/api/feriados/{feriado_id}", response_model=Feriado)
def editar_feriado(feriado_id: str, body: NovoFeriado, admin: UsuarioAtual = Depends(require_admin)):
    _validar_feriado(body)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE feriados
                    SET nome = %s, data_inicio = %s, data_fim = %s, tipo = %s, escritorio_fechado = %s, observacao = %s
                    WHERE id = %s;
                    """,
                    (body.nome.strip(), body.dataInicio, body.dataFim, body.tipo, body.escritorioFechado, body.observacao, feriado_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Feriado não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Feriado não encontrado.")
    registrar_log(admin.id, "feriado.editar", entidade="feriados", entidade_id=feriado_id)
    row = fetch_one(f"SELECT {_COLUNAS} FROM feriados WHERE id = %s;", (feriado_id,))
    return _serialize(row)


@router.delete("/api/feriados/{feriado_id}", status_code=204)
def excluir_feriado(feriado_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM feriados WHERE id = %s;", (feriado_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Feriado não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Feriado não encontrado.")
    registrar_log(admin.id, "feriado.excluir", entidade="feriados", entidade_id=feriado_id)
