"""Notificações: cada usuário só vê e marca como lida as próprias
(destinatario_id = si mesmo) + as gerais (destinatario_id NULL). Bug crítico
corrigido nesta auditoria: a listagem e o "marcar todas como lidas" não
filtravam por destinatário, vazando/afetando notificações de todo mundo."""

from database import get_connection


def test_notificacoes_exige_sessao(client, api_key_header):
    resp = client.get("/api/notificacoes", headers=api_key_header)
    assert resp.status_code == 401


def test_notificacao_pessoal_e_isolada_por_usuario(client, admin_headers, user_headers):
    admin_id = client.get("/api/auth/me", headers=admin_headers).json()["id"]

    notificacao_id = None
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notificacoes (destinatario_id, mensagem, tipo, lida)
                    VALUES (%s, %s, 'AVISO', false)
                    RETURNING id;
                    """,
                    (admin_id, "Notificação de teste (isolamento) — apagar"),
                )
                notificacao_id = cur.fetchone()["id"]
            conn.commit()

        # Outro usuário não vê a notificação pessoal do admin na listagem.
        resp_listar_outro = client.get("/api/notificacoes", headers=user_headers)
        assert resp_listar_outro.status_code == 200
        assert not any(n["id"] == notificacao_id for n in resp_listar_outro.json())

        # Nem consegue marcar como lida (404, não vaza que existe pra outra pessoa).
        resp_marcar_outro = client.patch(f"/api/notificacoes/{notificacao_id}/lida", headers=user_headers)
        assert resp_marcar_outro.status_code == 404

        # O dono vê a própria notificação e consegue marcar como lida.
        resp_listar_dono = client.get("/api/notificacoes", headers=admin_headers)
        assert any(n["id"] == notificacao_id for n in resp_listar_dono.json())

        resp_marcar_dono = client.patch(f"/api/notificacoes/{notificacao_id}/lida", headers=admin_headers)
        assert resp_marcar_dono.status_code == 200
        assert resp_marcar_dono.json()["lida"] is True
    finally:
        if notificacao_id:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM notificacoes WHERE id = %s;", (notificacao_id,))
                conn.commit()


def test_marcar_todas_lidas_nao_afeta_notificacao_de_outro_usuario(client, admin_headers, user_headers):
    admin_id = client.get("/api/auth/me", headers=admin_headers).json()["id"]

    notificacao_id = None
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notificacoes (destinatario_id, mensagem, tipo, lida)
                    VALUES (%s, %s, 'AVISO', false)
                    RETURNING id;
                    """,
                    (admin_id, "Notificação de teste (marcar-todas) — apagar"),
                )
                notificacao_id = cur.fetchone()["id"]
            conn.commit()

        # João (user_headers) marca as próprias como lidas — não pode zerar
        # o "não lido" da notificação pessoal do admin.
        resp = client.post("/api/notificacoes/marcar-todas-lidas", headers=user_headers)
        assert resp.status_code == 200

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT lida FROM notificacoes WHERE id = %s;", (notificacao_id,))
                assert cur.fetchone()["lida"] is False
    finally:
        if notificacao_id:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM notificacoes WHERE id = %s;", (notificacao_id,))
                conn.commit()
