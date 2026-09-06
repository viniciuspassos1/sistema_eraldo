import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel

from config import API_KEY, JWT_SECRET, JWT_EXPIRES_HOURS_SESSAO, JWT_EXPIRES_HOURS_PERSISTENTE
from database import fetch_one

JWT_ALGORITHM = "HS256"

# Bloqueio de login por tentativas incorretas — em memória (sem Redis/tabela
# nova), por e-mail normalizado. Suficiente para o tamanho do time; reseta
# se o processo reiniciar, o que é aceitável aqui (não é uma defesa contra
# um atacante persistente, é um freio contra tentativa automatizada básica).
_MAX_TENTATIVAS = 5
_JANELA_BLOQUEIO_SEGUNDOS = 15 * 60
_tentativas_falhas: dict[str, list[float]] = defaultdict(list)


def _tentativas_recentes(chave: str) -> list[float]:
    agora = time.time()
    recentes = [t for t in _tentativas_falhas.get(chave, []) if agora - t < _JANELA_BLOQUEIO_SEGUNDOS]
    _tentativas_falhas[chave] = recentes
    return recentes


def login_bloqueado(chave: str) -> bool:
    return len(_tentativas_recentes(chave)) >= _MAX_TENTATIVAS


def registrar_falha_login(chave: str) -> None:
    _tentativas_recentes(chave).append(time.time())


def limpar_falhas_login(chave: str) -> None:
    _tentativas_falhas.pop(chave, None)


# Rate limit geral (todos os endpoints, não só login) — mesmo estilo acima:
# em memória, por IP, reseta se o processo reiniciar. Limite bem folgado de
# propósito: não é uma proteção fina calibrada por endpoint, é só uma rede
# de segurança contra abuso grosseiro (bot varrendo a API). Um escritório
# pequeno costuma sair pra internet atrás de um único IP (NAT) — várias
# pessoas usando o app ao mesmo tempo (cada uma gerando ~15-30 requisições
# só no carregamento do dashboard, mais o double-render do React StrictMode
# em dev) compartilham essa mesma contagem, então o limite precisa ser alto
# o bastante pra nunca incomodar uso legítimo.
_MAX_REQUISICOES_POR_MINUTO = 1000
_JANELA_RATE_LIMIT_SEGUNDOS = 60
_requisicoes_por_ip: dict[str, list[float]] = defaultdict(list)


def requisicao_permitida(ip: str) -> bool:
    agora = time.time()
    recentes = [t for t in _requisicoes_por_ip.get(ip, []) if agora - t < _JANELA_RATE_LIMIT_SEGUNDOS]
    recentes.append(agora)
    _requisicoes_por_ip[ip] = recentes
    return len(recentes) <= _MAX_REQUISICOES_POR_MINUTO


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


# Hash bcrypt fixo (mesmo custo de um hash real), calculado uma vez no import.
# Usado só pra sempre rodar bcrypt.checkpw no login, mesmo quando o e-mail não
# existe — sem isso, a ausência da chamada ao bcrypt (custo ~100ms) vaza por
# timing quais e-mails existem no banco, mesmo a mensagem de erro sendo igual.
_HASH_DUMMY = bcrypt.hashpw(b"tempo-constante", bcrypt.gensalt()).decode("utf-8")


def verificar_senha_tempo_constante(senha: str, senha_hash: str | None) -> bool:
    return verificar_senha(senha, senha_hash or _HASH_DUMMY)


# Marca de "senha trocada em" por usuário — em memória, por processo, mesmo
# trade-off já aceito pro bloqueio de login (_tentativas_falhas) acima: reseta
# se o processo reiniciar, o que é aceitável pro tamanho do time (single
# worker). Existe só pra invalidar tokens JWT emitidos antes da troca de
# senha — sem isso, um token vazado continua válido até expirar (até 30 dias
# no modo "manter conectado") mesmo depois da vítima trocar a senha.
_senha_alterada_em: dict[str, int] = {}


def invalidar_tokens_anteriores(usuario_id: str) -> None:
    # int(), não float(): o "iat" do JWT só tem resolução de segundo inteiro
    # (ver criar_token/PyJWT). Comparar um valor fracionário aqui contra um
    # "iat" truncado faria um token emitido no MESMO segundo da troca (mas
    # logicamente depois dela, ex.: login imediato com a senha nova) ser
    # rejeitado à toa, já que int(iat) pode ficar < float(agora) mesmo sendo
    # o mesmo segundo.
    _senha_alterada_em[usuario_id] = int(time.time())


def criar_token(usuario_id: str, perfil: str, persistente: bool) -> str:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET não configurado no backend (.env).")
    horas = JWT_EXPIRES_HOURS_PERSISTENTE if persistente else JWT_EXPIRES_HOURS_SESSAO
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": usuario_id,
        "perfil": perfil,
        "iat": agora,
        "exp": agora + timedelta(hours=horas),
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

    alterada_em = _senha_alterada_em.get(str(payload.get("sub")))
    if alterada_em is not None and (payload.get("iat") is None or payload["iat"] < alterada_em):
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


# As 11 páginas do menu que aceitam permissão granular por usuário
# (Administração fica de fora — trancada só por perfil, ver require_admin).
PAGINAS_PERMISSAO = [
    "dashboard",
    "meu-authenticator",
    "assistente-ia",
    "base-conhecimento",
    "calendario",
    "manual",
    "documentos",
    "cooperativa-ideias",
    "tribunais",
    "solicitacoes",
    "notificacoes",
]

# Nome de exibição de cada página — só isso é "cosmético"; a lista de chaves
# válidas continua sendo PAGINAS_PERMISSAO acima. Fonte única de verdade:
# o frontend busca essa lista via GET /api/permissoes/paginas em vez de
# manter uma cópia própria (ver AdministracaoUsuarios.tsx) — sem isso, uma
# página nova cadastrada aqui não aparecia na tela de permissões até alguém
# lembrar de duplicar a mudança lá.
PAGINAS_LABELS: dict[str, str] = {
    "dashboard": "Início",
    "meu-authenticator": "Authenticator",
    "assistente-ia": "Assistente IA",
    "base-conhecimento": "Base de Conhecimento",
    "calendario": "Calendário",
    "manual": "Manual Interno",
    "documentos": "Documentos",
    "cooperativa-ideias": "Cooperativa",
    "tribunais": "Tribunais",
    "solicitacoes": "Solicitações",
    "notificacoes": "Notificações",
}


def usuario_tem_permissao(usuario_id: str, pagina: str) -> bool:
    row = fetch_one(
        "SELECT permitido FROM permissoes_acesso WHERE usuario_id = %s AND pagina = %s;",
        (usuario_id, pagina),
    )
    return row["permitido"] if row else True


def require_pagina(pagina: str):
    def _checagem(usuario: UsuarioAtual = Depends(require_user)) -> UsuarioAtual:
        if usuario.perfil != "ADMINISTRADOR" and not usuario_tem_permissao(usuario.id, pagina):
            raise HTTPException(status_code=403, detail="Sem permissão para acessar esta área.")
        return usuario

    return _checagem
