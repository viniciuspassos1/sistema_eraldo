from contextlib import contextmanager

from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from config import DATABASE_URL, DB_POOL_MIN, DB_POOL_MAX

_pool: ThreadedConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL não configurada no backend (.env). Veja .env.example.")
    _pool = ThreadedConnectionPool(
        DB_POOL_MIN,
        DB_POOL_MAX,
        DATABASE_URL,
        cursor_factory=RealDictCursor,
    )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection():
    if _pool is None:
        raise RuntimeError("Pool de conexão não inicializado — init_pool() precisa rodar no startup do app.")
    conn = _pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()


def fetch_one(query: str, params: tuple = ()) -> dict | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchone()
