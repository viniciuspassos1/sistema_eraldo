import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all, fetch_one, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, nome, email, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status, alergia_alimentar"


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
    alergiaAlimentar: str | None = None


class AtualizarAlergia(BaseModel):
    alergiaAlimentar: str | None = None


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
        alergiaAlimentar=row["alergia_alimentar"],
    )


@router.get("/api/funcionarios", response_model=list[Funcionario])
def listar_funcionarios():
    rows = fetch_all(f"SELECT {_COLUNAS} FROM usuarios ORDER BY nome;")
    return [_serialize(r) for r in rows]


@router.get("/api/funcionarios/{funcionario_id}", response_model=Funcionario)
def obter_funcionario(funcionario_id: str):
    try:
        row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE id = %s;", (funcionario_id,))
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")

    if not row:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
    return _serialize(row)


@router.patch("/api/funcionarios/minha-alergia", response_model=Funcionario)
def atualizar_minha_alergia(body: AtualizarAlergia, usuario: UsuarioAtual = Depends(require_user)):
    texto = body.alergiaAlimentar.strip() if body.alergiaAlimentar else None
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE usuarios SET alergia_alimentar = %s, updated_at = now() WHERE id = %s;",
                (texto, usuario.id),
            )
        conn.commit()

    row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE id = %s;", (usuario.id,))
    return _serialize(row)
