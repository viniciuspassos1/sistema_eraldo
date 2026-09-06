import logging
import os
import time
from contextlib import asynccontextmanager

import psycopg2
import pyotp
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from assistant.router import router as assistant_router
from routers import all_routers
from config import ALLOWED_ORIGINS, ENABLE_BACKGROUND_JOBS
from database import init_pool, close_pool
from jobs import iniciar_jobs, parar_jobs
from security import require_api_key, require_pagina, requisicao_permitida, UsuarioAtual

logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    if ENABLE_BACKGROUND_JOBS:
        iniciar_jobs()
    yield
    if ENABLE_BACKGROUND_JOBS:
        parar_jobs()
    close_pool()


app = FastAPI(title="Intranet Eraldo Júnior - Authenticator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["x-api-key", "content-type", "authorization"],
)


def _client_ip(request: Request) -> str:
    # Atrás de um proxy reverso (nginx, etc.), a origem real vem em
    # X-Forwarded-For; sem proxy, cai no IP direto da conexão.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


@app.middleware("http")
async def seguranca_middleware(request: Request, call_next):
    if not requisicao_permitida(_client_ip(request)):
        return JSONResponse(
            status_code=429,
            content={"detail": "Muitas requisições. Aguarde um instante e tente novamente."},
        )

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# Alguns routers já capturam isso na própria rota pra dar uma mensagem mais
# específica (ex.: "Funcionário não encontrado") — este handler é só a rede
# de segurança pros que não capturam: sem ele, um {id} de rota que não é um
# UUID válido (ex.: "/api/avisos/qualquer-coisa/marcar-lido") estourava no
# handler genérico de baixo (500 "Erro inesperado"), quando é claramente um
# erro de cliente (404). get_connection() já dá rollback na conexão antes de
# devolver ao pool mesmo quando a exceção escapa até aqui (ver database.py).
@app.exception_handler(psycopg2.errors.InvalidTextRepresentation)
async def id_invalido_handler(request: Request, exc: psycopg2.errors.InvalidTextRepresentation):
    return JSONResponse(status_code=404, content={"detail": "Recurso não encontrado."})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Erro inesperado no servidor."})


app.include_router(assistant_router)
for _router in all_routers:
    app.include_router(_router)


def load_services() -> list[dict]:
    """
    Lê os serviços configurados via variáveis de ambiente no formato:
    AUTH_SERVICE_<N>_NAME=Nome do serviço
    AUTH_SERVICE_<N>_SECRET=CHAVE_BASE32
    AUTH_SERVICE_<N>_PERFIS=ADMINISTRADOR,FINANCEIRO  (opcional)
    O segredo nunca sai deste processo — só o código atual, calculado aqui.
    PERFIS é opcional: se omitido, o serviço fica visível pra qualquer um com
    acesso à página "Meu Authenticator" (comportamento anterior, mantido por
    compatibilidade). Se definido, só perfis nessa lista veem o serviço —
    ADMINISTRADOR sempre vê todos, independente de PERFIS (ver get_codes).
    """
    services = []
    index = 1
    while True:
        name = os.getenv(f"AUTH_SERVICE_{index}_NAME")
        secret = os.getenv(f"AUTH_SERVICE_{index}_SECRET")
        if not name or not secret:
            break
        perfis_raw = os.getenv(f"AUTH_SERVICE_{index}_PERFIS", "").strip()
        perfis = [p.strip() for p in perfis_raw.split(",") if p.strip()] or None
        services.append({"id": f"service-{index}", "name": name, "secret": secret, "perfis": perfis})
        index += 1
    return services


@app.get("/api/authenticator/codes")
def get_codes(
    x_api_key: str | None = Header(default=None),
    usuario: UsuarioAtual = Depends(require_pagina("meu-authenticator")),
):
    require_api_key(x_api_key)

    services = load_services()
    if usuario.perfil != "ADMINISTRADOR":
        services = [s for s in services if s["perfis"] is None or usuario.perfil in s["perfis"]]
    if not services:
        raise HTTPException(
            status_code=404,
            detail="Nenhum serviço configurado. Veja backend/.env.example.",
        )

    now = time.time()
    result = []
    for service in services:
        totp = pyotp.TOTP(service["secret"])
        period = totp.interval
        seconds_remaining = period - int(now) % period
        result.append(
            {
                "id": service["id"],
                "name": service["name"],
                "code": totp.now(),
                "periodSeconds": period,
                "secondsRemaining": seconds_remaining,
            }
        )
    return {"services": result, "serverTime": int(now)}


@app.get("/api/health")
def health():
    return {"status": "ok"}
