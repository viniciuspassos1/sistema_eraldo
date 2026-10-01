from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from config import FRONTEND_URL, JWT_EXPIRES_MINUTOS_REDEFINICAO
from emailer import enviar_email, smtp_configurado
from security import (
    require_api_key,
    require_user,
    verificar_senha,
    verificar_senha_tempo_constante,
    criar_token,
    criar_token_redefinicao,
    validar_token_redefinicao,
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
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, nome, email, senha_hash, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status, alergia_alimentar"
_COLUNAS_PUBLICAS = "id, nome, email, cargo, setor, foto_url, perfil, data_entrada, aniversario, telefone, status, alergia_alimentar"


class LoginBody(BaseModel):
    email: EmailStr
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
        registrar_log(None, "login_bloqueado", detalhes={"email": email}, status="ERRO")
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
        registrar_log(None, "login_falhou", detalhes={"email": email}, status="ERRO")
        raise credenciais_invalidas

    limpar_falhas_login(email)
    token = criar_token(str(row["id"]), row["perfil"], body.manterConectado)
    registrar_log(str(row["id"]), "login")
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
    registrar_log(usuario.id, "trocar_senha")


class EsqueciSenhaBody(BaseModel):
    email: EmailStr


@router.post("/api/auth/esqueci-senha", status_code=204)
def esqueci_senha(body: EsqueciSenhaBody):
    email = body.email.strip().lower()

    # Mesmo limitador de tentativas do login (login_bloqueado/registrar_falha_login
    # aceitam qualquer string como chave) — prefixo próprio pra não misturar
    # contagem com falha de senha. Evita alguém spammar o e-mail de uma
    # pessoa pedindo redefinição repetidas vezes.
    chave = f"esqueci-senha:{email}"
    if login_bloqueado(chave):
        registrar_log(None, "esqueci_senha_bloqueado", detalhes={"email": email}, status="ERRO")
        return
    registrar_falha_login(chave)

    row = fetch_one("SELECT id, nome, status FROM usuarios WHERE email = %s;", (email,))

    # Resposta sempre 204, exista ou não o e-mail — sem isso, dava pra
    # descobrir quais e-mails estão cadastrados só testando esse endpoint
    # (mesma lógica anti-enumeração do login, ver verificar_senha_tempo_constante).
    if not row or row["status"] == "INATIVO":
        registrar_log(None, "esqueci_senha_email_desconhecido", detalhes={"email": email}, status="ERRO")
        return

    if not smtp_configurado() or not FRONTEND_URL:
        # Não expõe esse detalhe pro cliente (resposta continua 204 igual),
        # só fica registrado no log/servidor pra quem administra perceber.
        registrar_log(str(row["id"]), "esqueci_senha_smtp_nao_configurado", status="ERRO")
        return

    token = criar_token_redefinicao(str(row["id"]))
    link = f"{FRONTEND_URL}/#/redefinir-senha?token={token}"
    corpo = (
        f"Olá, {row['nome'].split(' ')[0]}!\n\n"
        "Recebemos um pedido para redefinir a senha da sua conta na intranet "
        "Eraldo Júnior Advocacia. Clique no link abaixo para escolher uma senha nova "
        f"(válido por {JWT_EXPIRES_MINUTOS_REDEFINICAO} minutos):\n\n"
        f"{link}\n\n"
        "Se você não pediu isso, pode ignorar este e-mail — sua senha atual continua funcionando normalmente."
    )
    enviar_email(email, "Redefinir senha - Intranet Eraldo Júnior", corpo)
    registrar_log(str(row["id"]), "esqueci_senha_solicitado")


class RedefinirSenhaBody(BaseModel):
    token: str
    novaSenha: str


@router.post("/api/auth/redefinir-senha", status_code=204)
def redefinir_senha(body: RedefinirSenhaBody):
    if len(body.novaSenha) < 8:
        raise HTTPException(status_code=400, detail="A nova senha precisa ter pelo menos 8 caracteres.")

    usuario_id = validar_token_redefinicao(body.token)

    row = fetch_one("SELECT status FROM usuarios WHERE id = %s;", (usuario_id,))
    if not row or row["status"] == "INATIVO":
        raise HTTPException(status_code=400, detail="Link inválido ou expirado.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE usuarios SET senha_hash = %s, updated_at = now() WHERE id = %s;",
                (hash_senha(body.novaSenha), usuario_id),
            )
        conn.commit()

    # Também invalida o próprio token de redefinição usado (mesmo corte de
    # "iat" que já derruba sessões antigas) — sem isso, o mesmo link
    # continuaria funcionando até expirar, mesmo depois de já ter sido usado.
    invalidar_tokens_anteriores(usuario_id)
    registrar_log(usuario_id, "redefinir_senha")


@router.post("/api/auth/logout", status_code=204)
def logout(usuario: UsuarioAtual = Depends(require_user)):
    # Não existe blocklist de token hoje — o token continua tecnicamente
    # válido até expirar por conta própria. Isso aqui só existe pra deixar
    # o "saiu do sistema" registrado na auditoria; o frontend descarta o
    # token guardado independente da resposta desta chamada.
    registrar_log(usuario.id, "logout")
