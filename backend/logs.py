"""Log de auditoria — registra ações administrativas/sensíveis (não é log de
toda requisição, só o que vale a pena investigar depois: login, mudança de
permissão, criação/edição/exclusão feita pela Administração).

Nunca deve derrubar a requisição que a originou — uma falha ao gravar o log
é logada no stdout e engolida, em vez de virar erro 500 pro usuário.
"""

import json
import logging

from database import get_connection

logger = logging.getLogger("logs_auditoria")


def registrar_log(
    usuario_id: str | None,
    acao: str,
    entidade: str | None = None,
    entidade_id: str | None = None,
    detalhes: dict | None = None,
    status: str = "SUCESSO",
) -> None:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO logs_auditoria (usuario_id, acao, entidade, entidade_id, detalhes, status)
                    VALUES (%s, %s, %s, %s, %s, %s);
                    """,
                    (usuario_id, acao, entidade, entidade_id, json.dumps(detalhes) if detalhes else None, status),
                )
            conn.commit()
    except Exception:
        logger.exception("Falha ao registrar log de auditoria (ação=%s, entidade=%s)", acao, entidade)


def registrar_edicao(
    usuario_id: str | None,
    acao: str,
    entidade: str,
    entidade_id: str,
    anterior: dict,
    novo: dict,
    status: str = "SUCESSO",
) -> None:
    """Como registrar_log, mas só grava os campos que de fato mudaram entre
    `anterior` (linha antes do UPDATE) e `novo` (payload aplicado), no
    formato {"campo": {"de": valor_antigo, "para": valor_novo}} — pronto
    pro modal de detalhe do frontend renderizar "de → para". Se nada mudou,
    não grava log nenhum (edição que não alterou nada não é um evento)."""
    mudancas = {campo: {"de": anterior.get(campo), "para": valor} for campo, valor in novo.items() if anterior.get(campo) != valor}
    if mudancas:
        registrar_log(usuario_id, acao, entidade=entidade, entidade_id=entidade_id, detalhes=mudancas, status=status)
