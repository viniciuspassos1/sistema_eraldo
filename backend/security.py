import os

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

API_KEY = os.getenv("API_KEY", "")


def require_api_key(x_api_key: str | None) -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="API_KEY não configurada no backend (.env). Veja .env.example.",
        )
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Chave de API inválida.")
