"""Regressão: /api/funcionarios exige sessão de usuário (JWT), não só a
X-API-Key — que fica embutida em texto plano no bundle público do frontend
e não deve ser a única barreira para dados de todos os funcionários."""


def test_listar_funcionarios_exige_sessao(client, api_key_header):
    resp = client.get("/api/funcionarios", headers=api_key_header)
    assert resp.status_code == 401


def test_obter_funcionario_exige_sessao(client, api_key_header):
    resp = client.get("/api/funcionarios/qualquer-id", headers=api_key_header)
    assert resp.status_code == 401


def test_listar_funcionarios_com_sessao_funciona(client, user_headers):
    resp = client.get("/api/funcionarios", headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
