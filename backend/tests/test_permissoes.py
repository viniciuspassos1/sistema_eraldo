"""Controle de acesso por perfil (require_admin) e por página (require_pagina)."""

import pytest


def test_usuario_comum_nao_acessa_administracao(client, user_headers):
    resp = client.get("/api/permissoes", headers=user_headers)
    assert resp.status_code == 403


def test_admin_acessa_permissoes_de_todos(client, admin_headers):
    resp = client.get("/api/permissoes", headers=admin_headers)
    assert resp.status_code == 200
    dados = resp.json()
    assert isinstance(dados, dict)
    assert len(dados) > 0


def test_usuario_comum_nao_gerencia_permissoes_de_outro(client, user_headers):
    resp = client.get("/api/permissoes/qualquer-id", headers=user_headers)
    assert resp.status_code == 403


@pytest.fixture
def joao_id(client, admin_headers):
    resp = client.get("/api/funcionarios", headers=admin_headers)
    funcionarios = resp.json()
    return next(f["id"] for f in funcionarios if f["email"] == "joao.lima@proferaldojunior.com.br")


def test_require_pagina_bloqueia_e_libera_conforme_permissao(client, admin_headers, user_headers, joao_id):
    """Revoga 'documentos' do João, confirma 403, restaura e confirma 200 de novo.
    Sempre restaura no finally, mesmo se uma asserção falhar no meio."""
    try:
        resp = client.put(
            f"/api/permissoes/{joao_id}",
            headers=admin_headers,
            json=[{"pagina": "documentos", "permitido": False}],
        )
        assert resp.status_code == 200

        resp_bloqueado = client.get("/api/documentos", headers=user_headers)
        assert resp_bloqueado.status_code == 403
    finally:
        resp_restaura = client.put(
            f"/api/permissoes/{joao_id}",
            headers=admin_headers,
            json=[{"pagina": "documentos", "permitido": True}],
        )
        assert resp_restaura.status_code == 200

    resp_liberado = client.get("/api/documentos", headers=user_headers)
    assert resp_liberado.status_code == 200


def test_administrador_nunca_e_bloqueado_por_pagina(client, admin_headers):
    """Mesmo sem nenhuma permissão explícita cadastrada, ADMINISTRADOR sempre passa."""
    resp = client.get("/api/documentos", headers=admin_headers)
    assert resp.status_code == 200
    resp2 = client.get("/api/tribunais", headers=admin_headers)
    assert resp2.status_code == 200
