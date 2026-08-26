from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key
from database import fetch_all

router = APIRouter(dependencies=[Depends(require_api_key)])

_QUERY = """
    SELECT a.id, a.titulo, a.conteudo, u.nome AS autor, a.data, a.prioridade, a.publico
    FROM avisos a
    LEFT JOIN usuarios u ON u.id = a.autor_id
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
    # "Não lido" ainda é um estado só do navegador (useState em Avisos.tsx) —
    # persistir por usuário depende de autenticação real (avisos_leituras já
    # existe no schema, esperando isso). Todo aviso chega do backend como não lido.
    lido: bool = False


def _serialize(row: dict) -> Aviso:
    return Aviso(
        id=str(row["id"]),
        titulo=row["titulo"],
        conteudo=row["conteudo"],
        autor=row["autor"] or "",
        data=row["data"].isoformat(),
        prioridade=row["prioridade"],
        publico=row["publico"],
    )


@router.get("/api/avisos", response_model=list[Aviso])
def listar_avisos():
    rows = fetch_all(_QUERY)
    return [_serialize(r) for r in rows]
