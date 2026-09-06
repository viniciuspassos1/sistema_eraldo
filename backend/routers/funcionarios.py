import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, hash_senha, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_STATUS_VALIDOS = {"ATIVO", "INATIVO", "FERIAS"}
_PERFIS_VALIDOS = {"ADMINISTRADOR", "GESTOR", "FUNCIONARIO"}

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


class NovoFuncionario(BaseModel):
    nome: str
    email: str
    senhaInicial: str
    cargo: str
    setor: str
    perfil: str = "FUNCIONARIO"
    dataEntrada: str
    aniversario: str
    telefone: str | None = None


class AtualizarFuncionario(BaseModel):
    nome: str
    cargo: str
    setor: str
    perfil: str
    telefone: str | None = None


class AtualizarStatusFuncionario(BaseModel):
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
        alergiaAlimentar=row["alergia_alimentar"],
    )


@router.get("/api/funcionarios", response_model=list[Funcionario])
def listar_funcionarios(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(f"SELECT {_COLUNAS} FROM usuarios ORDER BY nome;")
    return [_serialize(r) for r in rows]


@router.get("/api/funcionarios/{funcionario_id}", response_model=Funcionario)
def obter_funcionario(funcionario_id: str, usuario: UsuarioAtual = Depends(require_user)):
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


@router.post("/api/funcionarios", response_model=Funcionario, status_code=201)
def criar_funcionario(body: NovoFuncionario, admin: UsuarioAtual = Depends(require_admin)):
    if body.perfil not in _PERFIS_VALIDOS:
        raise HTTPException(status_code=400, detail="Perfil inválido.")
    if len(body.senhaInicial) < 8:
        raise HTTPException(status_code=400, detail="A senha inicial precisa ter pelo menos 8 caracteres.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO usuarios (nome, email, senha_hash, cargo, setor, perfil, data_entrada, aniversario, telefone)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (
                        body.nome.strip(),
                        body.email.strip().lower(),
                        hash_senha(body.senhaInicial),
                        body.cargo.strip(),
                        body.setor.strip(),
                        body.perfil,
                        body.dataEntrada,
                        body.aniversario,
                        body.telefone,
                    ),
                )
                novo_id = cur.fetchone()["id"]
            conn.commit()
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Já existe um funcionário com esse e-mail.")

    registrar_log(admin.id, "funcionario.criar", entidade="usuarios", entidade_id=str(novo_id))

    row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE id = %s;", (novo_id,))
    return _serialize(row)


@router.put("/api/funcionarios/{funcionario_id}", response_model=Funcionario)
def editar_funcionario(funcionario_id: str, body: AtualizarFuncionario, admin: UsuarioAtual = Depends(require_admin)):
    if body.perfil not in _PERFIS_VALIDOS:
        raise HTTPException(status_code=400, detail="Perfil inválido.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE usuarios
                    SET nome = %s, cargo = %s, setor = %s, perfil = %s, telefone = %s, updated_at = now()
                    WHERE id = %s;
                    """,
                    (body.nome.strip(), body.cargo.strip(), body.setor.strip(), body.perfil, body.telefone, funcionario_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")

    registrar_log(admin.id, "funcionario.editar", entidade="usuarios", entidade_id=funcionario_id, detalhes=body.model_dump())

    row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE id = %s;", (funcionario_id,))
    return _serialize(row)


@router.patch("/api/funcionarios/{funcionario_id}/status", response_model=Funcionario)
def atualizar_status_funcionario(
    funcionario_id: str, body: AtualizarStatusFuncionario, admin: UsuarioAtual = Depends(require_admin)
):
    if body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")
    if funcionario_id == admin.id and body.status == "INATIVO":
        raise HTTPException(status_code=400, detail="Você não pode desativar sua própria conta.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE usuarios SET status = %s, updated_at = now() WHERE id = %s;",
                    (body.status, funcionario_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")

    registrar_log(admin.id, "funcionario.status", entidade="usuarios", entidade_id=funcionario_id, detalhes={"status": body.status})

    row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE id = %s;", (funcionario_id,))
    return _serialize(row)
