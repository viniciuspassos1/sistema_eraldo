"""Jobs de fundo (backend/jobs.py). Não sobem os loops (ENABLE_BACKGROUND_JOBS
fica false nos testes, de propósito — ver config.py), mas as funções de
checagem são chamadas diretamente e cada teste apaga o que criou."""

from datetime import date, timedelta

import jobs
from database import get_connection


def test_smtp_nao_configurado_desativa_lembrete_por_email():
    # Sem SMTP_HOST no .env de teste, o job de lembrete de reunião não deve
    # tentar mandar e-mail nenhum (nem lançar exceção).
    assert jobs.smtp_configurado() is False
    jobs._checar_lembretes_reuniao()  # não deve levantar


def test_solicitacao_estagnada_gera_notificacao_para_o_responsavel(client, admin_headers):
    resp_admin = client.get("/api/auth/me", headers=admin_headers)
    admin_id = resp_admin.json()["id"]

    solicitacao_id = None
    notificacao_ids = []
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                data_antiga = date.today() - timedelta(days=jobs.SOLICITACAO_SLA_DIAS + 1)
                cur.execute(
                    """
                    INSERT INTO solicitacoes (numero, solicitante_id, categoria, descricao, responsavel_id, data, status)
                    VALUES ('SOL-TESTE-9999', %s, 'Suporte técnico', 'Teste automatizado — apagar', %s, %s, 'ABERTO')
                    RETURNING id;
                    """,
                    (admin_id, admin_id, data_antiga),
                )
                solicitacao_id = cur.fetchone()["id"]
            conn.commit()

        jobs._checar_solicitacoes_sla()

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id FROM notificacoes WHERE destinatario_id = %s AND tipo = 'SOLICITACAO' AND mensagem LIKE %s;",
                    (admin_id, "%SOL-TESTE-9999%"),
                )
                notificacao_ids = [r["id"] for r in cur.fetchall()]
        assert len(notificacao_ids) == 1

        # Rodar de novo não deve duplicar (dedupe por tipo + mensagem + janela de dias).
        jobs._checar_solicitacoes_sla()
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) AS n FROM notificacoes WHERE destinatario_id = %s AND tipo = 'SOLICITACAO' AND mensagem LIKE %s;",
                    (admin_id, "%SOL-TESTE-9999%"),
                )
                assert cur.fetchone()["n"] == 1
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if solicitacao_id:
                    cur.execute("DELETE FROM solicitacoes WHERE id = %s;", (solicitacao_id,))
                cur.execute(
                    "DELETE FROM notificacoes WHERE tipo = 'SOLICITACAO' AND mensagem LIKE %s;",
                    ("%SOL-TESTE-9999%",),
                )
            conn.commit()
