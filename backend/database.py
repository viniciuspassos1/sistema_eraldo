import os

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL não configurada no backend (.env). Veja .env.example.")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
