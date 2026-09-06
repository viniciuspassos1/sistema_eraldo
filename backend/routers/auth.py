from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import (
    require_api_key,
    require_user,
    verificar_senha,
    verificar_senha_tempo_constante,
    criar_token,
    hash_senha,
    invalidar_tokens_anteriores,
    login_bloqueado,
    registrar_falha_login,
    limpar_falhas_login,
    usuario_tem_permissao,
    PAGINAS_PERMISSAO,
    UsuarioAtual,
)
from database import fetch_one, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, nome, email, senha_hash, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status, alergia_alimentar"
_COLUNAS_PUBLICAS = "id, nome, email, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status, alergia_alimentar"


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
    alergiaAlimentar: str | None = None
    permissoes: dict[str, bool]


class LoginResposta(BaseModel):
    token: str
    usuario: UsuarioPublico


def _permissoes_do_usuario(usuario_id: str, perfil: str) -> dict[str, bool]:
    if perfil == "ADMINISTRADOR":
        return {pagina: True for pagina in PAGINAS_PERMISSAO}
    return {pagina: usuario_tem_permissao(usuario_id, pagina) for pagina in PAGINAS_PERMISSAO}


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
        alergiaAlimentar=row["alergia_alimentar"],
        permissoes=_permissoes_do_usuario(str(row["id"]), row["perfil"]),
    )


@router.post("/api/auth/login", response_model=LoginResposta)
def login(body: LoginBody):
    email = body.email.strip().lower()

    if login_bloqueado(email):
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        )

    row = fetch_one(f"SELECT {_COLUNAS} FROM usuarios WHERE email = %s;", (email,))

    # Sempre roda bcrypt.checkpw (mesmo sem `row`), pra não vazar por timing
    # se o e-mail existe ou não — ver verificar_senha_tempo_constante.
    senha_valida = verificar_senha_tempo_constante(body.senha, row["senha_hash"] if row else None)

    credenciais_invalidas = HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    if not row or row["status"] == "INATIVO" or not senha_valida:
        registrar_falha_login(email)
        raise credenciais_invalidas

    limpar_falhas_login(email)
    token = criar_token(str(row["id"]), row["perfil"], body.manterConectado)
    return LoginResposta(token=token, usuario=_usuario_publico(row))


@router.get("/api/auth/me", response_model=UsuarioPublico)
def me(usuario: UsuarioAtual = Depends(require_user)):
    row = fetch_one(f"SELECT {_COLUNAS_PUBLICAS} FROM usuarios WHERE id = %s;", (usuario.id,))
    if not row:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    return _usuario_publico(row)


class TrocarSenhaBody(BaseModel):
    senhaAtual: str
    novaSenha: str


@router.post("/api/auth/trocar-senha", status_code=204)
def trocar_senha(body: TrocarSenhaBody, usuario: UsuarioAtual = Depends(require_user)):
    if len(body.novaSenha) < 8:
        raise HTTPException(status_code=400, detail="A nova senha precisa ter pelo menos 8 caracteres.")

    row = fetch_one("SELECT senha_hash FROM usuarios WHERE id = %s;", (usuario.id,))
    if not row or not verificar_senha(body.senhaAtual, row["senha_hash"]):
        raise HTTPException(status_code=401, detail="Senha atual incorreta.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE usuarios SET senha_hash = %s, updated_at = now() WHERE id = %s;",
                (hash_senha(body.novaSenha), usuario.id),
            )
        conn.commit()

    invalidar_tokens_anteriores(usuario.id)
