import os
import time

import pyotp
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from assistant.router import router as assistant_router
from funcionarios.router import router as funcionarios_router
from security import require_api_key

load_dotenv()

ALLOWED_ORIGINS = [
    "http://localhost:8091",
    "http://127.0.0.1:8091",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(title="Intranet Eraldo Júnior - Authenticator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["x-api-key", "content-type"],
)

app.include_router(assistant_router)
app.include_router(funcionarios_router)


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
def get_codes(x_api_key: str | None = Header(default=None)):
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
