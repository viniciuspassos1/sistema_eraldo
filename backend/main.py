import os
import time
from contextlib import asynccontextmanager

import pyotp
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from assistant.router import router as assistant_router
from routers import all_routers
from config import ALLOWED_ORIGINS
from database import init_pool, close_pool
from security import require_api_key, require_pagina


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    yield
    close_pool()


app = FastAPI(title="Intranet Eraldo Júnior - Authenticator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["x-api-key", "content-type", "authorization"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Erro inesperado no servidor."})


app.include_router(assistant_router)
for _router in all_routers:
    app.include_router(_router)


def load_services() -> list[dict]:
    """
    Lê os serviços configurados via variáveis de ambiente no formato:
    AUTH_SERVICE_<N>_NAME=Nome do serviço
    AUTH_SERVICE_<N>_SECRET=CHAVE_BASE32
    O segredo nunca sai deste processo — só o código atual, calculado aqui.
    """
    services = []
    index = 1
    while True:
        name = os.getenv(f"AUTH_SERVICE_{index}_NAME")
        secret = os.getenv(f"AUTH_SERVICE_{index}_SECRET")
        if not name or not secret:
            break
        services.append({"id": f"service-{index}", "name": name, "secret": secret})
        index += 1
    return services


@app.get("/api/authenticator/codes")
def get_codes(x_api_key: str | None = Header(default=None), _=Depends(require_pagina("meu-authenticator"))):
    require_api_key(x_api_key)

    services = load_services()
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
