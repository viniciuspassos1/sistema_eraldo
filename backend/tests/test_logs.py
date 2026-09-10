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


def test_permissoes_atualizar_gera_log(client, admin_headers):
    resp_user = client.get("/api/auth/me", headers=admin_headers)
    admin_id = resp_user.json()["id"]

    # PUT em cima do próprio conjunto de permissões do admin não muda nada
    # de verdade (admin sempre vê tudo), mas já dispara o registro de log.
    resp = client.get(f"/api/permissoes/{admin_id}", headers=admin_headers)
    assert resp.status_code == 200

    resp_put = client.put(f"/api/permissoes/{admin_id}", headers=admin_headers, json=resp.json())
    assert resp_put.status_code == 200

    resp_logs = client.get("/api/logs?acao=permissoes.atualizar&limit=5", headers=admin_headers)
    assert resp_logs.status_code == 200
    assert len(resp_logs.json()) >= 1
