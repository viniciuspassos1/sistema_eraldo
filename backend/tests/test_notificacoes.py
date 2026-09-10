"""Notificações: cada usuário só vê e marca como lida/vista as próprias
(destinatario_id = si mesmo) + as gerais (destinatario_id NULL). Bug crítico
corrigido numa auditoria anterior: a listagem e o "marcar todas" não
filtravam por destinatário, vazando/afetando notificações de todo mundo —
os dois primeiros testes abaixo protegem isso continuar valendo depois da
migração lida (bool) -> status (NAO_LIDA/VISTA/CONFIRMADA)."""

import uuid

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
                    INSERT INTO notificacoes (destinatario_id, mensagem, tipo)
                    VALUES (%s, %s, 'AVISO')
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

        # Nem consegue marcar como vista (404, não vaza que existe pra outra pessoa).
        resp_marcar_outro = client.patch(f"/api/notificacoes/{notificacao_id}/vista", headers=user_headers)
        assert resp_marcar_outro.status_code == 404

        # O dono vê a própria notificação e consegue marcar como vista, depois confirmada.
        resp_listar_dono = client.get("/api/notificacoes", headers=admin_headers)
        assert any(n["id"] == notificacao_id for n in resp_listar_dono.json())

        resp_vista = client.patch(f"/api/notificacoes/{notificacao_id}/vista", headers=admin_headers)
        assert resp_vista.status_code == 200
        assert resp_vista.json()["status"] == "VISTA"

        resp_confirmar = client.patch(f"/api/notificacoes/{notificacao_id}/confirmar", headers=admin_headers)
        assert resp_confirmar.status_code == 200
        assert resp_confirmar.json()["status"] == "CONFIRMADA"

        # Status nunca regride: confirmar de novo (ou marcar vista de novo) continua CONFIRMADA.
        resp_vista_de_novo = client.patch(f"/api/notificacoes/{notificacao_id}/vista", headers=admin_headers)
        assert resp_vista_de_novo.json()["status"] == "CONFIRMADA"
    finally:
        if notificacao_id:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM notificacoes WHERE id = %s;", (notificacao_id,))
                conn.commit()


def test_marcar_todas_vistas_nao_afeta_notificacao_de_outro_usuario(client, admin_headers, user_headers):
    admin_id = client.get("/api/auth/me", headers=admin_headers).json()["id"]

    notificacao_id = None
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notificacoes (destinatario_id, mensagem, tipo)
                    VALUES (%s, %s, 'AVISO')
                    RETURNING id;
                    """,
                    (admin_id, "Notificação de teste (marcar-todas) — apagar"),
                )
                notificacao_id = cur.fetchone()["id"]
            conn.commit()

        # João (user_headers) marca as próprias como vistas — não pode afetar
        # a notificação pessoal do admin.
        resp = client.post("/api/notificacoes/marcar-todas-vistas", headers=user_headers)
        assert resp.status_code == 200

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT status FROM notificacoes WHERE id = %s;", (notificacao_id,))
                assert cur.fetchone()["status"] == "NAO_LIDA"
    finally:
        if notificacao_id:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM notificacoes WHERE id = %s;", (notificacao_id,))
                conn.commit()


def test_alerta_agenda_nao_duplica_para_o_mesmo_evento(client, admin_headers):
    origem_id = str(uuid.uuid4())
    try:
        resp1 = client.post(
            "/api/notificacoes/alerta-agenda",
            headers=admin_headers,
            json={"origemTipo": "AGENDA_EVENTO", "origemId": origem_id, "mensagem": "Reunião — agora, 14:00"},
        )
        assert resp1.status_code == 201
        corpo1 = resp1.json()
        assert corpo1["criado"] is True
        assert corpo1["status"] == "NAO_LIDA"
        assert corpo1["tipo"] == "AGENDA"

        # Chamar de novo pro MESMO evento (ex.: reload da página, outra aba
        # aberta) não cria uma segunda notificação — devolve a mesma, com
        # criado=false, pro frontend saber que não deve repetir o alarme.
        resp2 = client.post(
            "/api/notificacoes/alerta-agenda",
            headers=admin_headers,
            json={"origemTipo": "AGENDA_EVENTO", "origemId": origem_id, "mensagem": "Reunião — agora, 14:00"},
        )
        assert resp2.status_code == 201
        corpo2 = resp2.json()
        assert corpo2["criado"] is False
        assert corpo2["id"] == corpo1["id"]
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM notificacoes WHERE origem_id = %s;", (origem_id,))
            conn.commit()


def test_alerta_agenda_rejeita_origem_tipo_invalido(client, admin_headers):
    resp = client.post(
        "/api/notificacoes/alerta-agenda",
        headers=admin_headers,
        json={"origemTipo": "QUALQUER_COISA", "origemId": str(uuid.uuid4()), "mensagem": "Teste"},
    )
    assert resp.status_code == 400
