import os

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

_DEFAULT_ORIGINS = "http://localhost:8091,http://127.0.0.1:8091,http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if origin.strip()]

DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_EXPIRES_HOURS_SESSAO = int(os.getenv("JWT_EXPIRES_HOURS_SESSAO", "12"))
JWT_EXPIRES_HOURS_PERSISTENTE = int(os.getenv("JWT_EXPIRES_HOURS_PERSISTENTE", "720"))
