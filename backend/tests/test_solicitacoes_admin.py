"""PATCH /api/solicitacoes/{id}: admin (ou o responsável já atribuído) muda
status/atribui responsável; qualquer outro usuário não pode."""


def test_criador_nao_muda_status_da_propria_solicitacao(client, user_headers):
    resp_criar = client.post(
        "/api/solicitacoes", headers=user_headers, json={"categoria": "Suporte técnico", "descricao": "Teste automatizado."}
    )
    assert resp_criar.status_code == 201
    solicitacao_id = resp_criar.json()["id"]

    resp = client.patch(f"/api/solicitacoes/{solicitacao_id}", headers=user_headers, json={"status": "RESOLVIDO"})
    assert resp.status_code == 403


def test_admin_muda_status_e_atribui_responsavel(client, admin_headers, user_headers):
    resp_me = client.get("/api/auth/me", headers=user_headers)
    user_id = resp_me.json()["id"]

    resp_criar = client.post(
        "/api/solicitacoes", headers=user_headers, json={"categoria": "Suporte técnico", "descricao": "Teste automatizado 2."}
    )
    solicitacao_id = resp_criar.json()["id"]

    resp_atribuir = client.patch(
        f"/api/solicitacoes/{solicitacao_id}",
        headers=admin_headers,
        json={"status": "EM_ANDAMENTO", "responsavelId": user_id},
    )
    assert resp_atribuir.status_code == 200
    assert resp_atribuir.json()["status"] == "EM_ANDAMENTO"

    # agora o próprio responsável (não-admin) consegue avançar o status,
    # mas não reatribuir a outra pessoa.
    resp_avancar = client.patch(f"/api/solicitacoes/{solicitacao_id}", headers=user_headers, json={"status": "RESOLVIDO"})
    assert resp_avancar.status_code == 200
    assert resp_avancar.json()["status"] == "RESOLVIDO"

    resp_reatribuir = client.patch(
        f"/api/solicitacoes/{solicitacao_id}", headers=user_headers, json={"responsavelId": user_id}
    )
    assert resp_reatribuir.status_code == 403
