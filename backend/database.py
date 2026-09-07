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
    """
    autocommit=True por padrão: sem isso, toda consulta (mesmo um SELECT
    isolado) abre uma transação implícita que nunca é fechada explicitamente
    pelos callers de leitura — psycopg2.pool então roda um ROLLBACK sozinho
    ao devolver a conexão pro pool (ver AbstractConnectionPool._putconn).
    Resultado: 3 idas à rede por consulta (BEGIN implícito + a query +
    ROLLBACK) em vez de 1 — com o banco num datacenter remoto (Supabase),
    isso media ~550ms por chamada em vez de ~180ms. Quem precisar de uma
    transação de verdade (múltiplos `execute()` atômicos entre si — hoje só
    `solicitacoes.criar_solicitacao`, por causa do lock de concorrência no
    número sequencial) define `conn.autocommit = False` explicitamente no
    início do próprio bloco.
    """
    if _pool is None:
        raise RuntimeError("Pool de conexão não inicializado — init_pool() precisa rodar no startup do app.")
    conn = _pool.getconn()
    conn.autocommit = True
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


@contextmanager
def standalone_pool():
    """Para scripts fora do FastAPI (seeds, migrações) — o app normal inicializa
    o pool no lifespan de main.py; um script solto precisa fazer isso na mão."""
    init_pool()
    try:
        yield
    finally:
        close_pool()


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
