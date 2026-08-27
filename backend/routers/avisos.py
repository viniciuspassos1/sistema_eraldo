from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_QUERY = """
    SELECT a.id, a.titulo, a.conteudo, u.nome AS autor, a.data, a.prioridade, a.publico,
           (al.usuario_id IS NOT NULL) AS lido
    FROM avisos a
    LEFT JOIN usuarios u ON u.id = a.autor_id
    LEFT JOIN avisos_leituras al ON al.aviso_id = a.id AND al.usuario_id = %s
    ORDER BY a.data DESC;
"""


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
