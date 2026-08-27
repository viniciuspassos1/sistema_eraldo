from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel

from config import API_KEY, JWT_SECRET, JWT_EXPIRES_HOURS_SESSAO, JWT_EXPIRES_HOURS_PERSISTENTE
from database import fetch_one

JWT_ALGORITHM = "HS256"


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="API_KEY não configurada no backend (.env). Veja .env.example.",
        )
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Chave de API inválida.")


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:
        return False


def criar_token(usuario_id: str, perfil: str, persistente: bool) -> str:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET não configurado no backend (.env).")
    horas = JWT_EXPIRES_HOURS_PERSISTENTE if persistente else JWT_EXPIRES_HOURS_SESSAO
    payload = {
        "sub": usuario_id,
        "perfil": perfil,
        "exp": datetime.now(timezone.utc) + timedelta(hours=horas),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class UsuarioAtual(BaseModel):
    id: str
    nome: str
    email: str
    cargo: str
    setor: str
    perfil: str
    status: str


def require_user(authorization: str | None = Header(default=None)) -> UsuarioAtual:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET não configurado no backend (.env).")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sessão não autenticada.")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")

    row = fetch_one(
        "SELECT id, nome, email, cargo, setor, perfil, status FROM usuarios WHERE id = %s;",
        (payload.get("sub"),),
    )
    if not row:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    if row["status"] == "INATIVO":
        raise HTTPException(status_code=403, detail="Usuário inativo.")

    return UsuarioAtual(
        id=str(row["id"]),
        nome=row["nome"],
        email=row["email"],
        cargo=row["cargo"],
        setor=row["setor"],
        perfil=row["perfil"],
        status=row["status"],
    )


def require_admin(usuario: UsuarioAtual = Depends(require_user)) -> UsuarioAtual:
    if usuario.perfil != "ADMINISTRADOR":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return usuario
