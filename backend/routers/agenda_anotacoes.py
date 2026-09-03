import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_all, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_COLUNAS = "id, data, horario, titulo, tipo, local, texto"

_TIPOS_VALIDOS = {"AUDIENCIA", "REUNIAO", "COMPROMISSO", "EVENTO", "OUTRO"}


class Anotacao(BaseModel):
    id: str
    data: str
    horario: str
    titulo: str
    tipo: str
    local: str | None = None
    texto: str | None = None


class NovaAnotacao(BaseModel):
    data: str
    horario: str
    titulo: str
    tipo: str = "OUTRO"
    local: str | None = None
    texto: str | None = None


class AtualizarAnotacao(BaseModel):
    titulo: str
    tipo: str = "OUTRO"
    local: str | None = None
    texto: str | None = None


def _serialize(row: dict) -> Anotacao:
    return Anotacao(
        id=str(row["id"]),
        data=row["data"].isoformat(),
        horario=row["horario"].isoformat(timespec="minutes"),
        titulo=row["titulo"],
        tipo=row["tipo"],
        local=row["local"],
        texto=row["texto"],
    )


@router.get("/api/agenda/anotacoes", response_model=list[Anotacao])
def listar_anotacoes(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(
        f"SELECT {_COLUNAS} FROM agenda_anotacoes WHERE usuario_id = %s ORDER BY data, horario;",
        (usuario.id,),
    )
    return [_serialize(r) for r in rows]


@router.post("/api/agenda/anotacoes", response_model=Anotacao, status_code=201)
def criar_anotacao(body: NovaAnotacao, usuario: UsuarioAtual = Depends(require_user)):
    titulo = body.titulo.strip()
    if not titulo:
        raise HTTPException(status_code=400, detail="Dê um título ao compromisso.")
    if body.tipo not in _TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo inválido.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO agenda_anotacoes (usuario_id, data, horario, titulo, tipo, local, texto)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING {_COLUNAS};
                """,
                (usuario.id, body.data, body.horario, titulo, body.tipo, body.local, body.texto),
            )
            row = cur.fetchone()
        conn.commit()

    return _serialize(row)


@router.put("/api/agenda/anotacoes/{anotacao_id}", response_model=Anotacao)
def atualizar_anotacao(anotacao_id: str, body: AtualizarAnotacao, usuario: UsuarioAtual = Depends(require_user)):
    titulo = body.titulo.strip()
    if not titulo:
        raise HTTPException(status_code=400, detail="Dê um título ao compromisso.")
    if body.tipo not in _TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo inválido.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE agenda_anotacoes SET titulo = %s, tipo = %s, local = %s, texto = %s
                    WHERE id = %s AND usuario_id = %s
                    RETURNING {_COLUNAS};
                    """,
                    (titulo, body.tipo, body.local, body.texto, anotacao_id, usuario.id),
                )
                row = cur.fetchone()
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")

    if not row:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")
    return _serialize(row)


@router.delete("/api/agenda/anotacoes/{anotacao_id}", status_code=204)
def apagar_anotacao(anotacao_id: str, usuario: UsuarioAtual = Depends(require_user)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM agenda_anotacoes WHERE id = %s AND usuario_id = %s;",
                    (anotacao_id, usuario.id),
                )
                encontrada = cur.rowcount > 0
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")

    if not encontrada:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")
