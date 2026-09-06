import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_pagina, require_user, UsuarioAtual
from database import fetch_all, get_connection

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("notificacoes"))])

_COLUNAS = "id, mensagem, data, lida, tipo"


class Notificacao(BaseModel):
    id: str
    mensagem: str
    data: str
    lida: bool
    tipo: str


def _serialize(row: dict) -> Notificacao:
    return Notificacao(
        id=str(row["id"]),
        mensagem=row["mensagem"],
        data=row["data"].date().isoformat(),
        lida=row["lida"],
        tipo=row["tipo"],
    )


@router.get("/api/notificacoes", response_model=list[Notificacao])
def listar_notificacoes(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(
        f"SELECT {_COLUNAS} FROM notificacoes WHERE destinatario_id = %s OR destinatario_id IS NULL ORDER BY data DESC;",
        (usuario.id,),
    )
    return [_serialize(r) for r in rows]


@router.patch("/api/notificacoes/{notificacao_id}/lida", response_model=Notificacao)
def marcar_lida(notificacao_id: str, usuario: UsuarioAtual = Depends(require_user)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE notificacoes SET lida = true
                    WHERE id = %s AND (destinatario_id = %s OR destinatario_id IS NULL);
                    """,
                    (notificacao_id, usuario.id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Notificação não encontrada.")
            conn.commit()

            with conn.cursor() as cur:
                cur.execute(f"SELECT {_COLUNAS} FROM notificacoes WHERE id = %s;", (notificacao_id,))
                row = cur.fetchone()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")

    return _serialize(row)


@router.post("/api/notificacoes/marcar-todas-lidas")
def marcar_todas_lidas(usuario: UsuarioAtual = Depends(require_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notificacoes SET lida = true WHERE lida = false AND destinatario_id = %s;",
                (usuario.id,),
            )
        conn.commit()
    return {"status": "ok"}
