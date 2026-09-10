import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key, require_pagina, require_user, UsuarioAtual
from database import fetch_all, fetch_one, get_connection

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("notificacoes"))])

_COLUNAS = "id, mensagem, data, status, tipo, origem_tipo, origem_id"
_ORIGENS_VALIDAS = {"AGENDA_EVENTO", "AGENDA_ANOTACAO"}


class Notificacao(BaseModel):
    id: str
    mensagem: str
    data: str
    status: str
    tipo: str
    origemTipo: str | None = None
    origemId: str | None = None


def _serialize(row: dict) -> Notificacao:
    return Notificacao(
        id=str(row["id"]),
        mensagem=row["mensagem"],
        data=row["data"].isoformat(),
        status=row["status"],
        tipo=row["tipo"],
        origemTipo=row["origem_tipo"],
        origemId=str(row["origem_id"]) if row["origem_id"] else None,
    )


@router.get("/api/notificacoes", response_model=list[Notificacao])
def listar_notificacoes(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(
        f"SELECT {_COLUNAS} FROM notificacoes "
        "WHERE destinatario_id = %s OR destinatario_id IS NULL "
        "ORDER BY data DESC;",
        (usuario.id,),
    )
    return [_serialize(r) for r in rows]


def _atualizar_status(notificacao_id: str, usuario_id: str, novo_status: str) -> Notificacao:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Confirma primeiro que a notificação existe E é visível pra
                # esse usuário (dono ou geral) — sem isso, um id de
                # notificação de outra pessoa cairia direto no UPDATE/SELECT
                # abaixo sem filtro nenhum, vazando a mensagem dela.
                cur.execute(
                    f"SELECT {_COLUNAS} FROM notificacoes "
                    "WHERE id = %s AND (destinatario_id = %s OR destinatario_id IS NULL);",
                    (notificacao_id, usuario_id),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Notificação não encontrada.")

                ordem = {"NAO_LIDA": 0, "VISTA": 1, "CONFIRMADA": 2}
                # NAO_LIDA -> VISTA -> CONFIRMADA: nunca deixa o status voltar
                # pra trás (ex.: reabrir o sino não desconfirma um alerta já
                # confirmado antes) — no-op silencioso, não é erro.
                if ordem[novo_status] > ordem[row["status"]]:
                    cur.execute("UPDATE notificacoes SET status = %s WHERE id = %s;", (novo_status, notificacao_id))
                    row = dict(row)
                    row["status"] = novo_status
            conn.commit()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")

    return _serialize(row)


@router.patch("/api/notificacoes/{notificacao_id}/vista", response_model=Notificacao)
def marcar_vista(notificacao_id: str, usuario: UsuarioAtual = Depends(require_user)):
    return _atualizar_status(notificacao_id, usuario.id, "VISTA")


@router.patch("/api/notificacoes/{notificacao_id}/confirmar", response_model=Notificacao)
def marcar_confirmada(notificacao_id: str, usuario: UsuarioAtual = Depends(require_user)):
    return _atualizar_status(notificacao_id, usuario.id, "CONFIRMADA")


@router.post("/api/notificacoes/marcar-todas-vistas")
def marcar_todas_vistas(usuario: UsuarioAtual = Depends(require_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notificacoes SET status = 'VISTA' "
                "WHERE status = 'NAO_LIDA' AND (destinatario_id = %s OR destinatario_id IS NULL);",
                (usuario.id,),
            )
        conn.commit()
    return {"status": "ok"}


class AlertaAgenda(BaseModel):
    origemTipo: str
    origemId: str
    mensagem: str


class NotificacaoComCriado(Notificacao):
    criado: bool  # False = já existia (evento já tinha gerado alerta antes) — não repetir som/popup


@router.post("/api/notificacoes/alerta-agenda", response_model=NotificacaoComCriado, status_code=201)
def criar_alerta_agenda(body: AlertaAgenda, usuario: UsuarioAtual = Depends(require_user)):
    """Chamado pelo frontend (AgendaAlerts.tsx) quando o horário de um
    compromisso chega — sempre cria a notificação pro PRÓPRIO usuário
    logado (nunca um destinatário arbitrário, dispensa checagem extra de
    permissão). O índice único em (destinatario_id, origem_tipo, origem_id)
    garante no banco que chamar isso de novo pro mesmo evento (reload da
    página, várias abas abertas) nunca duplica — só devolve o que já existia,
    com `criado=false`, pro frontend saber que não deve repetir o alarme."""
    if body.origemTipo not in _ORIGENS_VALIDAS:
        raise HTTPException(status_code=400, detail="origemTipo inválido.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO notificacoes (destinatario_id, mensagem, tipo, origem_tipo, origem_id)
                VALUES (%s, %s, 'AGENDA', %s, %s)
                ON CONFLICT (destinatario_id, origem_tipo, origem_id) WHERE origem_tipo IS NOT NULL
                DO NOTHING
                RETURNING id;
                """,
                (usuario.id, body.mensagem, body.origemTipo, body.origemId),
            )
            inserida = cur.fetchone()
        conn.commit()

    if inserida:
        row = fetch_one(f"SELECT {_COLUNAS} FROM notificacoes WHERE id = %s;", (inserida["id"],))
        return NotificacaoComCriado(**_serialize(row).model_dump(), criado=True)

    existente = fetch_one(
        f"SELECT {_COLUNAS} FROM notificacoes WHERE destinatario_id = %s AND origem_tipo = %s AND origem_id = %s;",
        (usuario.id, body.origemTipo, body.origemId),
    )
    if not existente:
        raise HTTPException(status_code=500, detail="Falha ao registrar o alerta de agenda.")
    return NotificacaoComCriado(**_serialize(existente).model_dump(), criado=False)
