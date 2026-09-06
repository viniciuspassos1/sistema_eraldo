"""Regressão: /api/feriados exige sessão de usuário (JWT), não só a
X-API-Key — mesmo motivo de test_funcionarios.py e test_ferias.py."""


def test_listar_feriados_exige_sessao(client, api_key_header):
    resp = client.get("/api/feriados", headers=api_key_header)
    assert resp.status_code == 401


def test_listar_feriados_com_sessao_funciona(client, user_headers):
    resp = client.get("/api/feriados", headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
