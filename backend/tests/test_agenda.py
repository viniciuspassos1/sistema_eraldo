"""GET /api/agenda/eventos: cada funcionário só vê os compromissos oficiais
em que é o responsável (mais os sem responsável definido, que valem pro
escritório inteiro); administrador vê todos, pra coordenação geral."""

from datetime import date

from database import get_connection


def test_agenda_eventos_exige_sessao(client, api_key_header):
    resp = client.get("/api/agenda/eventos", headers=api_key_header)
    assert resp.status_code == 401


def test_funcionario_ve_so_o_proprio_evento_e_os_sem_responsavel(client, admin_headers, user_headers):
    resp_admin = client.get("/api/auth/me", headers=admin_headers)
    admin_id = resp_admin.json()["id"]
    resp_user = client.get("/api/auth/me", headers=user_headers)
    user_id = resp_user.json()["id"]

    ids = {}
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                for chave, responsavel_id in (
                    ("do_admin", admin_id),
                    ("do_usuario", user_id),
                    ("sem_responsavel", None),
                ):
                    cur.execute(
                        """
                        INSERT INTO agenda_eventos (titulo, tipo, data, horario, responsavel_id)
                        VALUES (%s, 'REUNIAO', %s, '10:00', %s)
                        RETURNING id;
                        """,
                        (f"Teste automatizado — {chave}", date.today(), responsavel_id),
                    )
                    ids[chave] = cur.fetchone()["id"]
            conn.commit()

        resp = client.get("/api/agenda/eventos", headers=user_headers)
        assert resp.status_code == 200
        titulos = {e["titulo"] for e in resp.json()}
        assert "Teste automatizado — do_usuario" in titulos
        assert "Teste automatizado — sem_responsavel" in titulos
        assert "Teste automatizado — do_admin" not in titulos

        resp_admin_view = client.get("/api/agenda/eventos", headers=admin_headers)
        assert resp_admin_view.status_code == 200
        titulos_admin = {e["titulo"] for e in resp_admin_view.json()}
        assert {"Teste automatizado — do_usuario", "Teste automatizado — sem_responsavel", "Teste automatizado — do_admin"} <= titulos_admin
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM agenda_eventos WHERE id = ANY(%s::uuid[]);", (list(ids.values()),))
            conn.commit()
