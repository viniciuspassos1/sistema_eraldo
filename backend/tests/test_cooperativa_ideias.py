"""PATCH /api/cooperativa-ideias/{id}: só administrador pode mudar o status
de uma ideia (fluxo tipo kanban) — antes qualquer usuário com acesso à
página conseguia mover a ideia de qualquer pessoa no funil."""

from database import get_connection


def test_usuario_comum_nao_muda_status_de_ideia(client, admin_headers, user_headers):
    resp_criar = client.post(
        "/api/cooperativa-ideias",
        headers=user_headers,
        json={"titulo": "Teste automatizado", "descricao": "Descrição de teste.", "formato": "Post", "tema": "Tema de teste"},
    )
    assert resp_criar.status_code == 201
    ideia_id = resp_criar.json()["id"]

    try:
        resp_user = client.patch(
            f"/api/cooperativa-ideias/{ideia_id}",
            headers=user_headers,
            json={"status": "APROVADA"},
        )
        assert resp_user.status_code == 403

        resp_admin = client.patch(
            f"/api/cooperativa-ideias/{ideia_id}",
            headers=admin_headers,
            json={"status": "APROVADA"},
        )
        assert resp_admin.status_code == 200
        assert resp_admin.json()["status"] == "APROVADA"

        resp_logs = client.get("/api/logs?acao=ideia&limit=50", headers=admin_headers)
        logs_da_ideia = [log for log in resp_logs.json() if log["entidadeId"] == ideia_id]
        assert any(log["acao"] == "ideia.criar" for log in logs_da_ideia)
        log_atualizar = next(log for log in logs_da_ideia if log["acao"] == "ideia.atualizar")
        assert log_atualizar["detalhes"]["status"] == {"de": "NOVA", "para": "APROVADA"}
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM cooperativa_ideias WHERE id = %s;", (ideia_id,))
            conn.commit()
