import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_pagina, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("solicitacoes"))])

_STATUS_VALIDOS = {"ABERTO", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDO", "CANCELADO"}

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
    # Trava consultivo de transação (chave arbitrária fixa, liberada sozinha
    # no commit/rollback do INSERT que chama esta função): sem isso, duas
    # requisições concorrentes podem ler o mesmo MAX(numero) e gerar o mesmo
    # próximo número (numero é unique — a segunda daria erro de integridade
    # em vez de simplesmente ganhar o próximo número da fila).
    cur.execute("SELECT pg_advisory_xact_lock(hashtext('solicitacoes_numero')::bigint);")
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


class AtualizarSolicitacao(BaseModel):
    status: str | None = None
    responsavelId: str | None = None


@router.patch("/api/solicitacoes/{solicitacao_id}", response_model=Solicitacao)
def atualizar_solicitacao(
    solicitacao_id: str, body: AtualizarSolicitacao, usuario: UsuarioAtual = Depends(require_user)
):
    if body.status is not None and body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")

    try:
        atual = fetch_one("SELECT responsavel_id FROM solicitacoes WHERE id = %s;", (solicitacao_id,))
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    if not atual:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    e_admin = usuario.perfil == "ADMINISTRADOR"
    e_responsavel = atual["responsavel_id"] is not None and str(atual["responsavel_id"]) == usuario.id
    if not e_admin and not e_responsavel:
        raise HTTPException(status_code=403, detail="Só o administrador ou o responsável podem atualizar esta solicitação.")
    if body.responsavelId is not None and not e_admin:
        raise HTTPException(status_code=403, detail="Só o administrador pode reatribuir a solicitação.")

    campos = []
    valores = []
    if body.status is not None:
        campos.append("status = %s")
        valores.append(body.status)
    if body.responsavelId is not None:
        campos.append("responsavel_id = %s")
        valores.append(body.responsavelId)

    if campos:
        valores.append(solicitacao_id)
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE solicitacoes SET {', '.join(campos)} WHERE id = %s;", tuple(valores))
            conn.commit()

    registrar_log(
        usuario.id,
        "solicitacao.atualizar",
        entidade="solicitacoes",
        entidade_id=solicitacao_id,
        detalhes=body.model_dump(exclude_none=True),
    )

    row = fetch_one(_SELECT + " WHERE s.id = %s;", (solicitacao_id,))
    return _serialize(row)
