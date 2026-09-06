"""Regressão: /api/ferias exige sessão de usuário (JWT), não só a X-API-Key
— mesmo motivo de test_funcionarios.py."""


def test_listar_ferias_exige_sessao(client, api_key_header):
    resp = client.get("/api/ferias", headers=api_key_header)
    assert resp.status_code == 401


def test_listar_ferias_com_sessao_funciona(client, user_headers):
    resp = client.get("/api/ferias", headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
