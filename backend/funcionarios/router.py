import psycopg2
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from security import require_api_key
from database import get_connection

router = APIRouter()

_COLUNAS = "id, nome, email, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status"


class Funcionario(BaseModel):
    id: str
    nome: str
    email: str
    cargo: str
    setor: str
    fotoUrl: str | None = None
    perfil: str
    dataEntrada: str
    aniversario: str
    telefone: str | None = None
    status: str


def _serialize(row: dict) -> Funcionario:
    return Funcionario(
        id=str(row["id"]),
        nome=row["nome"],
        email=row["email"],
        cargo=row["cargo"],
        setor=row["setor"],
        fotoUrl=row["foto_url"],
        perfil=row["perfil"],
        dataEntrada=row["data_entrada"].isoformat(),
        aniversario=row["aniversario"].isoformat(),
        telefone=row["telefone"],
        status=row["status"],
    )


@router.get("/api/funcionarios", response_model=list[Funcionario])
def listar_funcionarios(x_api_key: str | None = Header(default=None)):
    require_api_key(x_api_key)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT {_COLUNAS} FROM usuarios ORDER BY nome;")
            rows = cur.fetchall()
        return [_serialize(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/funcionarios/{funcionario_id}", response_model=Funcionario)
def obter_funcionario(funcionario_id: str, x_api_key: str | None = Header(default=None)):
    require_api_key(x_api_key)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT {_COLUNAS} FROM usuarios WHERE id = %s;", (funcionario_id,))
            row = cur.fetchone()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
    return _serialize(row)
