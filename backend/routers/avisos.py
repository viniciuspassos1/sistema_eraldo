import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection
from logs import registrar_log

router = APIRouter(dependencies=[Depends(require_api_key)])

_PRIORIDADES_VALIDAS = {"INFORMATIVO", "URGENTE", "ADMINISTRATIVO", "JURIDICO", "TECNOLOGIA"}

_COLUNAS = """
    a.id, a.titulo, a.conteudo, u.nome AS autor, a.data, a.prioridade, a.publico,
    (al.usuario_id IS NOT NULL) AS lido
"""
_JOIN = """
    FROM avisos a
    LEFT JOIN usuarios u ON u.id = a.autor_id
    LEFT JOIN avisos_leituras al ON al.aviso_id = a.id AND al.usuario_id = %s
"""
_QUERY = f"SELECT {_COLUNAS} {_JOIN} ORDER BY a.data DESC;"
_QUERY_POR_ID = f"SELECT {_COLUNAS} {_JOIN} WHERE a.id = %s;"


class Aviso(BaseModel):
    id: str
    titulo: str
    conteudo: str
    autor: str
    data: str
    prioridade: str
    publico: str
    lido: bool


def _serialize(row: dict) -> Aviso:
    return Aviso(
        id=str(row["id"]),
        titulo=row["titulo"],
        conteudo=row["conteudo"],
        autor=row["autor"] or "",
        data=row["data"].isoformat(),
        prioridade=row["prioridade"],
        publico=row["publico"],
        lido=row["lido"],
    )


@router.get("/api/avisos", response_model=list[Aviso])
def listar_avisos(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(_QUERY, (usuario.id,))
    return [_serialize(r) for r in rows]


@router.post("/api/avisos/{aviso_id}/marcar-lido", status_code=204)
def marcar_lido(aviso_id: str, usuario: UsuarioAtual = Depends(require_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO avisos_leituras (aviso_id, usuario_id)
                VALUES (%s, %s)
                ON CONFLICT (aviso_id, usuario_id) DO NOTHING;
                """,
                (aviso_id, usuario.id),
            )
        conn.commit()


class NovoAviso(BaseModel):
    titulo: str
    conteudo: str
    prioridade: str = "INFORMATIVO"
    publico: str = "Todos"


def _validar_aviso(body: NovoAviso) -> None:
    if body.prioridade not in _PRIORIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Prioridade inválida.")
    if not body.titulo.strip() or not body.conteudo.strip():
        raise HTTPException(status_code=400, detail="Título e conteúdo são obrigatórios.")


@router.post("/api/avisos", response_model=Aviso, status_code=201)
def criar_aviso(body: NovoAviso, admin: UsuarioAtual = Depends(require_admin)):
    _validar_aviso(body)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO avisos (titulo, conteudo, autor_id, prioridade, publico)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (body.titulo.strip(), body.conteudo.strip(), admin.id, body.prioridade, body.publico.strip()),
            )
            novo_id = cur.fetchone()["id"]
        conn.commit()

    registrar_log(admin.id, "aviso.criar", entidade="avisos", entidade_id=str(novo_id))

    row = fetch_one(_QUERY_POR_ID, (admin.id, novo_id))
    return _serialize(row)


@router.put("/api/avisos/{aviso_id}", response_model=Aviso)
def editar_aviso(aviso_id: str, body: NovoAviso, admin: UsuarioAtual = Depends(require_admin)):
    _validar_aviso(body)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE avisos SET titulo = %s, conteudo = %s, prioridade = %s, publico = %s
                    WHERE id = %s;
                    """,
                    (body.titulo.strip(), body.conteudo.strip(), body.prioridade, body.publico.strip(), aviso_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Aviso não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Aviso não encontrado.")

    registrar_log(admin.id, "aviso.editar", entidade="avisos", entidade_id=aviso_id)

    row = fetch_one(_QUERY_POR_ID, (admin.id, aviso_id))
    return _serialize(row)


@router.delete("/api/avisos/{aviso_id}", status_code=204)
def excluir_aviso(aviso_id: str, admin: UsuarioAtual = Depends(require_admin)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM avisos WHERE id = %s;", (aviso_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Aviso não encontrado.")
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Aviso não encontrado.")

    registrar_log(admin.id, "aviso.excluir", entidade="avisos", entidade_id=aviso_id)
