"""GET /api/logs: só admin acessa; o próprio login que a fixture faz pra
pegar o admin_headers já deve ter gravado um log de auditoria (ação
"login"), então dá pra verificar sem precisar disparar uma ação nova."""


def test_logs_exige_admin(client, user_headers):
    resp = client.get("/api/logs", headers=user_headers)
    assert resp.status_code == 403


def test_admin_ve_logs_de_login(client, admin_headers):
    resp = client.get("/api/logs?acao=login&limit=20", headers=admin_headers)
    assert resp.status_code == 200
    acoes = {log["acao"] for log in resp.json()}
    assert "login" in acoes


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
