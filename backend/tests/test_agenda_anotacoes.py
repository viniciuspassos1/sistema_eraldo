"""Compromissos pessoais da grade da Agenda (agenda_anotacoes): título é
obrigatório, tipo/local/observações são opcionais, e cada um só é visível
pra quem criou — diferente de agenda_eventos, que é do escritório inteiro."""

from database import get_connection


def test_criar_editar_e_apagar_proprio_compromisso(client, user_headers):
    resp_criar = client.post(
        "/api/agenda/anotacoes",
        headers=user_headers,
        json={"data": "2026-09-10", "horario": "14:30", "titulo": "Teste automatizado", "tipo": "REUNIAO", "local": "Sala 2"},
    )
    assert resp_criar.status_code == 201
    nota = resp_criar.json()
    assert nota["titulo"] == "Teste automatizado"
    assert nota["horario"] == "14:30"
    assert nota["local"] == "Sala 2"

    try:
        resp_editar = client.put(
            f"/api/agenda/anotacoes/{nota['id']}",
            headers=user_headers,
            json={"titulo": "Editado", "tipo": "OUTRO", "texto": "Detalhe extra"},
        )
        assert resp_editar.status_code == 200
        assert resp_editar.json()["titulo"] == "Editado"
        assert resp_editar.json()["texto"] == "Detalhe extra"
    finally:
        assert client.delete(f"/api/agenda/anotacoes/{nota['id']}", headers=user_headers).status_code == 204


def test_titulo_vazio_e_rejeitado(client, user_headers):
    resp = client.post(
        "/api/agenda/anotacoes",
        headers=user_headers,
        json={"data": "2026-09-10", "horario": "14:30", "titulo": "   "},
    )
    assert resp.status_code == 400


def test_compromisso_e_isolado_por_usuario(client, admin_headers, user_headers):
    resp_criar = client.post(
        "/api/agenda/anotacoes",
        headers=admin_headers,
        json={"data": "2026-09-10", "horario": "09:00", "titulo": "Compromisso privado do admin"},
    )
    assert resp_criar.status_code == 201
    nota_id = resp_criar.json()["id"]

    try:
        resp_listar_outro = client.get("/api/agenda/anotacoes", headers=user_headers)
        assert not any(n["id"] == nota_id for n in resp_listar_outro.json())

        resp_apagar_outro = client.delete(f"/api/agenda/anotacoes/{nota_id}", headers=user_headers)
        assert resp_apagar_outro.status_code == 404
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM agenda_anotacoes WHERE id = %s;", (nota_id,))
            conn.commit()
