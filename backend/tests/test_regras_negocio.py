"""Identidade de quem age vem sempre do token, nunca de um campo que o
cliente poderia falsificar no corpo da requisição."""

from database import get_connection


def test_solicitacao_usa_identidade_do_token(client, user_headers):
    resp = client.post(
        "/api/solicitacoes",
        headers=user_headers,
        json={"categoria": "Suporte técnico", "descricao": "Teste automatizado — apagar"},
    )
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["solicitante"] == "João Pedro Lima"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM solicitacoes WHERE id = %s;", (corpo["id"],))
        conn.commit()


def test_cooperativa_ideia_usa_identidade_do_token(client, user_headers):
    resp = client.post(
        "/api/cooperativa-ideias",
        headers=user_headers,
        json={
            "titulo": "Ideia de teste automatizado",
            "descricao": "Apagar depois",
            "formato": "Post",
            "tema": "Outro",
        },
    )
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["autor"] == "João Pedro Lima"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM cooperativa_ideias WHERE id = %s;", (corpo["id"],))
        conn.commit()


def test_onboarding_progresso_e_por_usuario_do_token(client, user_headers):
    resp = client.get("/api/onboarding/progresso", headers=user_headers)
    assert resp.status_code == 200
    itens = resp.json()
    assert len(itens) > 0
    assert all("itemId" in item and "concluido" in item for item in itens)
