"""POST/PUT/DELETE /api/base-conhecimento: só admin cria, edita e exclui artigos."""


def test_usuario_comum_nao_cria_artigo(client, user_headers):
    resp = client.post(
        "/api/base-conhecimento",
        headers=user_headers,
        json={"titulo": "Teste", "categoria": "Jurídico", "conteudo": "Teste"},
    )
    assert resp.status_code == 403


def test_admin_cria_edita_e_exclui_artigo(client, admin_headers):
    resp_criar = client.post(
        "/api/base-conhecimento",
        headers=admin_headers,
        json={"titulo": "Artigo automatizado", "categoria": "Jurídico", "conteudo": "Conteúdo de teste.", "status": "RASCUNHO"},
    )
    assert resp_criar.status_code == 201
    artigo_id = resp_criar.json()["id"]
    assert resp_criar.json()["status"] == "RASCUNHO"

    resp_editar = client.put(
        f"/api/base-conhecimento/{artigo_id}",
        headers=admin_headers,
        json={"titulo": "Artigo editado", "categoria": "Financeiro", "conteudo": "Editado.", "status": "PUBLICADO"},
    )
    assert resp_editar.status_code == 200
    assert resp_editar.json()["status"] == "PUBLICADO"

    resp_excluir = client.delete(f"/api/base-conhecimento/{artigo_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204
