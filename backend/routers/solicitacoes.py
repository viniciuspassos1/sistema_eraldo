from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_SELECT = """
    SELECT s.id, s.numero, su.nome AS solicitante, s.categoria, s.descricao,
           ru.nome AS responsavel, s.data, s.status
    FROM solicitacoes s
    JOIN usuarios su ON su.id = s.solicitante_id
    LEFT JOIN usuarios ru ON ru.id = s.responsavel_id
"""


class Solicitacao(BaseModel):
    id: str
    numero: str
    solicitante: str
    categoria: str
    descricao: str
    responsavel: str | None = None
    data: str
    status: str


class NovaSolicitacao(BaseModel):
    categoria: str
    descricao: str


def _serialize(row: dict) -> Solicitacao:
    return Solicitacao(
        id=str(row["id"]),
        numero=row["numero"],
        solicitante=row["solicitante"],
        categoria=row["categoria"],
        descricao=row["descricao"],
        responsavel=row["responsavel"],
        data=row["data"].isoformat(),
        status=row["status"],
    )


def _proximo_numero(cur) -> str:
    cur.execute("SELECT numero FROM solicitacoes ORDER BY numero DESC LIMIT 1;")
    row = cur.fetchone()
    if not row:
        return "SOL-0001"
    ultimo = int(row["numero"].split("-")[1])
    return f"SOL-{ultimo + 1:04d}"


@router.get("/api/solicitacoes", response_model=list[Solicitacao])
def listar_solicitacoes():
    rows = fetch_all(_SELECT + " ORDER BY s.data DESC, s.numero DESC;")
    return [_serialize(r) for r in rows]


@router.post("/api/solicitacoes", response_model=Solicitacao, status_code=201)
def criar_solicitacao(body: NovaSolicitacao, usuario: UsuarioAtual = Depends(require_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            numero = _proximo_numero(cur)
            cur.execute(
                """
                INSERT INTO solicitacoes (numero, solicitante_id, categoria, descricao)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """,
                (numero, usuario.id, body.categoria, body.descricao),
            )
            nova_id = cur.fetchone()["id"]
        conn.commit()

        with conn.cursor() as cur:
            cur.execute(_SELECT + " WHERE s.id = %s;", (nova_id,))
            row = cur.fetchone()

    return _serialize(row)
