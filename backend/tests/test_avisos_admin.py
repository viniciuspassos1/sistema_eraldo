"""POST/PUT/DELETE /api/avisos: só admin cria, edita e exclui avisos."""


def test_usuario_comum_nao_cria_aviso(client, user_headers):
    resp = client.post(
        "/api/avisos", headers=user_headers, json={"titulo": "Teste", "conteudo": "Teste", "prioridade": "INFORMATIVO"}
    )
    assert resp.status_code == 403


def test_admin_cria_edita_e_exclui_aviso(client, admin_headers):
    resp_criar = client.post(
        "/api/avisos",
        headers=admin_headers,
        json={"titulo": "Aviso automatizado", "conteudo": "Conteúdo de teste.", "prioridade": "INFORMATIVO", "publico": "Todos"},
    )
    assert resp_criar.status_code == 201
    aviso_id = resp_criar.json()["id"]

    resp_editar = client.put(
        f"/api/avisos/{aviso_id}",
        headers=admin_headers,
        json={"titulo": "Aviso automatizado editado", "conteudo": "Editado.", "prioridade": "URGENTE", "publico": "Todos"},
    )
    assert resp_editar.status_code == 200
    assert resp_editar.json()["titulo"] == "Aviso automatizado editado"
    assert resp_editar.json()["prioridade"] == "URGENTE"

    resp_excluir = client.delete(f"/api/avisos/{aviso_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204

    resp_lista = client.get("/api/avisos", headers=admin_headers)
    assert aviso_id not in {a["id"] for a in resp_lista.json()}
