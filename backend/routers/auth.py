from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, verificar_senha, criar_token, UsuarioAtual
from database import fetch_one

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, nome, email, senha_hash, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status"
_COLUNAS_PUBLICAS = "id, nome, email, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status"


class LoginBody(BaseModel):
    email: str
    senha: str
    manterConectado: bool = False


class UsuarioPublico(BaseModel):
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


class LoginResposta(BaseModel):
    token: str
    usuario: UsuarioPublico


def _usuario_publico(row: dict) -> UsuarioPublico:
    return UsuarioPublico(
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


@router.post("/api/auth/login", response_model=LoginResposta)
def login(body: LoginBody):
    row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE email = %s;", (body.email.strip().lower(),))

    credenciais_invalidas = HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    if not row or row["status"] == "INATIVO":
        raise credenciais_invalidas
    if not verificar_senha(body.senha, row["senha_hash"]):
        raise credenciais_invalidas

    token = criar_token(str(row["id"]), row["perfil"], body.manterConectado)
    return LoginResposta(token=token, usuario=_usuario_publico(row))


@router.get("/api/auth/me", response_model=UsuarioPublico)
def me(usuario: UsuarioAtual = Depends(require_user)):
    row = fetch_one(f"SELECT {_COLUNAS_PUBLICAS} FROM usuarios WHERE id = %s;", (usuario.id,))
    if not row:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    return _usuario_publico(row)
