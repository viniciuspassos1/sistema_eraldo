import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_TIPOS_VALIDOS = {"AUDIENCIA", "REUNIAO", "COMPROMISSO", "EVENTO", "OUTRO"}

_QUERY_BASE = """
    SELECT e.id, e.titulo, e.tipo, e.data, e.horario, u.nome AS responsavel, e.local, e.observacoes
    FROM agenda_eventos e
    LEFT JOIN usuarios u ON u.id = e.responsavel_id
"""


class AgendaEvento(BaseModel):
    id: str
    titulo: str
    tipo: str
    data: str
    horario: str
    responsavel: str
    local: str | None = None
    observacoes: str | None = None


def _serialize(row: dict) -> AgendaEvento:
    return AgendaEvento(
        id=str(row["id"]),
        titulo=row["titulo"],
        tipo=row["tipo"],
        data=row["data"].isoformat(),
        horario=row["horario"].isoformat(timespec="minutes"),
        responsavel=row["responsavel"] or "",
        local=row["local"],
        observacoes=row["observacoes"],
    )


@router.get("/api/agenda/eventos", response_model=list[AgendaEvento])
def listar_eventos(usuario: UsuarioAtual = Depends(require_user)):
    """Cada funcionário só vê os compromissos oficiais em que é o
    responsável (mais os sem responsável definido, que valem pro escritório
    inteiro). Administrador vê tudo, pra coordenação geral da agenda."""
    if usuario.perfil == "ADMINISTRADOR":
        rows = fetch_all(_QUERY_BASE + " ORDER BY e.data, e.horario;")
    else:
        rows = fetch_all(
            _QUERY_BASE + " WHERE e.responsavel_id = %s OR e.responsavel_id IS NULL ORDER BY e.data, e.horario;",
            (usuario.id,),
        )
    return [_serialize(r) for r in rows]


class NovoEvento(BaseModel):
    titulo: str
    tipo: str = "OUTRO"
    data: str
    horario: str
    responsavelId: str | None = None
    local: str | None = None
    observacoes: str | None = None


def _validar_evento(body: NovoEvento) -> None:
    if body.tipo not in _TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo inválido.")


def _buscar_por_id(evento_id: str) -> dict:
    row = fetch_one(_QUERY_BASE + " WHERE e.id = %s;", (evento_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    return row


@router.post("/api/agenda/eventos", response_model=AgendaEvento, status_code=201)
def criar_evento(body: NovoEvento, admin: UsuarioAtual = Depends(require_admin)):
    _validar_evento(body)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agenda_eventos (titulo, tipo, data, horario, responsavel_id, local, observacoes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.titulo.strip(), body.tipo, body.data, body.horario, body.responsavelId, body.local, body.observacoes),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()
    registrar_log(admin.id, "agenda_evento.criar", entidade="agenda_eventos", entidade_id=str(novo_id))
    return _serialize(_buscar_por_id(novo_id))


@router.put("/api/agenda/eventos/{evento_id}", response_model=AgendaEvento)
def editar_evento(evento_id: str, body: NovoEvento, admin: UsuarioAtual = Depends(require_admin)):
    _validar_evento(body)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE agenda_eventos
                    SET titulo = %s, tipo = %s, data = %s, horario = %s, responsavel_id = %s, local = %s, observacoes = %s
                    WHERE id = %s;
                    """,
                    (body.titulo.strip(), body.tipo, body.data, body.horario, body.responsavelId, body.local, body.observacoes, evento_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Evento não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    registrar_log(admin.id, "agenda_evento.editar", entidade="agenda_eventos", entidade_id=evento_id)
    return _serialize(_buscar_por_id(evento_id))


@router.delete("/api/agenda/eventos/{evento_id}", status_code=204)
def excluir_evento(evento_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM agenda_eventos WHERE id = %s;", (evento_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Evento não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    registrar_log(admin.id, "agenda_evento.excluir", entidade="agenda_eventos", entidade_id=evento_id)
