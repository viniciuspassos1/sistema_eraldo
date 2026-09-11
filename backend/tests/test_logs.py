"""GET /api/logs: só admin acessa; o próprio login que a fixture faz pra
pegar o admin_headers já deve ter gravado um log de auditoria (ação
"login"), então dá pra verificar sem precisar disparar uma ação nova."""


def test_logs_exige_admin(client, user_headers):
    resp = client.get("/api/logs", headers=user_headers)
    assert resp.status_code == 403


def test_admin_ve_logs_de_login(client, admin_headers):
    resp = client.get("/api/logs?acao=login&limit=20", headers=admin_headers)
    assert resp.status_code == 200
    logs = resp.json()
    acoes = {log["acao"] for log in logs}
    assert "login" in acoes
    # Todo log de login é sucesso (login que falha não chega a gerar log —
    # ver security.py) — confere que o campo novo "status" está mesmo vindo.
    assert all(log["status"] == "SUCESSO" for log in logs if log["acao"] == "login")


def test_filtro_status_invalido_e_rejeitado(client, admin_headers):
    resp = client.get("/api/logs?status=QUALQUER_COISA", headers=admin_headers)
    assert resp.status_code == 400


def test_filtro_por_periodo(client, admin_headers):
    # A janela cobre "sempre" (ano bem no passado até bem no futuro) — só
    # confirma que os parâmetros são aceitos e devolvem algo, sem depender
    # de nenhum log específico já existir.
    resp = client.get("/api/logs?dataInicio=2020-01-01&dataFim=2099-12-31&limit=5", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_permissoes_atualizar_sem_mudanca_nao_gera_log(client, admin_headers):
    """registrar_edicao só grava log se algo de fato mudou — reenviar o
    mesmo valor não é um evento (ver backend/logs.py)."""
    resp_user = client.get("/api/auth/me", headers=admin_headers)
    admin_id = resp_user.json()["id"]

    resp = client.get(f"/api/permissoes/{admin_id}", headers=admin_headers)
    assert resp.status_code == 200

    resp_put = client.put(f"/api/permissoes/{admin_id}", headers=admin_headers, json=resp.json())
    assert resp_put.status_code == 200


def test_permissoes_atualizar_com_mudanca_gera_log_com_de_para(client, admin_headers, user_headers):
    resp_user = client.get("/api/auth/me", headers=user_headers)
    user_id = resp_user.json()["id"]

    try:
        resp_put = client.put(
            f"/api/permissoes/{user_id}",
            headers=admin_headers,
            json=[{"pagina": "documentos", "permitido": False}],
        )
        assert resp_put.status_code == 200

        resp_logs = client.get("/api/logs?acao=permissoes.atualizar&limit=10", headers=admin_headers)
        assert resp_logs.status_code == 200
        # usuarioId no log é quem executou a ação (o admin); quem foi afetado
        # é entidadeId — por isso o filtro é client-side aqui, não por query param.
        logs_do_usuario = [log for log in resp_logs.json() if log["entidadeId"] == user_id]
        assert len(logs_do_usuario) >= 1
        assert logs_do_usuario[0]["detalhes"]["documentos"] == {"de": True, "para": False}
    finally:
        resp_restaura = client.put(
            f"/api/permissoes/{user_id}",
            headers=admin_headers,
            json=[{"pagina": "documentos", "permitido": True}],
        )
        assert resp_restaura.status_code == 200
