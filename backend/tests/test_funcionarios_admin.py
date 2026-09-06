"""POST/PUT/PATCH /api/funcionarios: só admin cadastra, edita e muda status."""

from database import get_connection


def _apagar_usuario(email: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM usuarios WHERE email = %s;", (email,))
        conn.commit()


def test_usuario_comum_nao_cadastra_funcionario(client, user_headers):
    resp = client.post(
        "/api/funcionarios",
        headers=user_headers,
        json={
            "nome": "Teste Automatizado",
            "email": "teste.automatizado.negado@proferaldojunior.com.br",
            "senhaInicial": "SenhaForte123",
            "cargo": "Estagiário",
            "setor": "TI",
            "dataEntrada": "2026-01-01",
            "aniversario": "2000-01-01",
        },
    )
    assert resp.status_code == 403


def test_admin_cadastra_edita_e_desativa_funcionario(client, admin_headers):
    email = "teste.automatizado.funcionario@proferaldojunior.com.br"
    try:
        resp_criar = client.post(
            "/api/funcionarios",
            headers=admin_headers,
            json={
                "nome": "Teste Automatizado",
                "email": email,
                "senhaInicial": "SenhaForte123",
                "cargo": "Estagiário",
                "setor": "TI",
                "dataEntrada": "2026-01-01",
                "aniversario": "2000-01-01",
            },
        )
        assert resp_criar.status_code == 201
        funcionario_id = resp_criar.json()["id"]
        assert resp_criar.json()["status"] == "ATIVO"

        resp_duplicado = client.post(
            "/api/funcionarios",
            headers=admin_headers,
            json={
                "nome": "Duplicado",
                "email": email,
                "senhaInicial": "SenhaForte123",
                "cargo": "Estagiário",
                "setor": "TI",
                "dataEntrada": "2026-01-01",
                "aniversario": "2000-01-01",
            },
        )
        assert resp_duplicado.status_code == 409

        resp_editar = client.put(
            f"/api/funcionarios/{funcionario_id}",
            headers=admin_headers,
            json={"nome": "Teste Automatizado Editado", "cargo": "Analista", "setor": "Jurídico", "perfil": "FUNCIONARIO"},
        )
        assert resp_editar.status_code == 200
        assert resp_editar.json()["nome"] == "Teste Automatizado Editado"
        assert resp_editar.json()["cargo"] == "Analista"

        resp_status = client.patch(
            f"/api/funcionarios/{funcionario_id}/status", headers=admin_headers, json={"status": "INATIVO"}
        )
        assert resp_status.status_code == 200
        assert resp_status.json()["status"] == "INATIVO"
    finally:
        _apagar_usuario(email)


def test_admin_nao_desativa_a_propria_conta(client, admin_headers):
    resp_me = client.get("/api/auth/me", headers=admin_headers)
    admin_id = resp_me.json()["id"]

    resp = client.patch(f"/api/funcionarios/{admin_id}/status", headers=admin_headers, json={"status": "INATIVO"})
    assert resp.status_code == 400
