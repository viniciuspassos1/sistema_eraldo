"""Central de Ajuda: pergunta pronta -> resposta é sempre o conteúdo do
artigo da Base de Conhecimento vinculado, nunca texto gerado."""

from database import get_connection


def _criar_artigo(admin_headers, client, titulo="Artigo de teste — apagar"):
    resp = client.post(
        "/api/base-conhecimento",
        headers=admin_headers,
        json={"titulo": titulo, "categoria": "Teste", "conteudo": "Conteúdo de teste — apagar depois.", "status": "PUBLICADO"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_perguntas_exige_sessao(client, api_key_header):
    resp = client.get("/api/chatbot/perguntas", headers=api_key_header)
    assert resp.status_code == 401


def test_usuario_comum_nao_gerencia_perguntas(client, user_headers):
    resp = client.post(
        "/api/chatbot/perguntas",
        headers=user_headers,
        json={"pergunta": "Teste?", "categoria": "Teste", "documentoId": "00000000-0000-0000-0000-000000000000"},
    )
    assert resp.status_code == 403


def test_criar_pergunta_com_documento_inexistente_e_rejeitado(client, admin_headers):
    resp = client.post(
        "/api/chatbot/perguntas",
        headers=admin_headers,
        json={"pergunta": "Teste?", "categoria": "Teste", "documentoId": "00000000-0000-0000-0000-000000000000"},
    )
    assert resp.status_code == 400


def test_ciclo_completo_criar_responder_editar_desativar_excluir(client, admin_headers, user_headers):
    documento_id = _criar_artigo(admin_headers, client)

    try:
        resp_criar = client.post(
            "/api/chatbot/perguntas",
            headers=admin_headers,
            json={"pergunta": "Como funciona o teste?", "categoria": "Teste", "documentoId": documento_id, "ordem": 1},
        )
        assert resp_criar.status_code == 201
        pergunta = resp_criar.json()
        assert pergunta["ativo"] is True

        # Usuário comum vê a pergunta ativa na listagem e consegue "abrir" ela.
        resp_lista = client.get("/api/chatbot/perguntas", headers=user_headers)
        assert any(p["id"] == pergunta["id"] for p in resp_lista.json())

        resp_resposta = client.get(f"/api/chatbot/perguntas/{pergunta['id']}", headers=user_headers)
        assert resp_resposta.status_code == 200
        corpo = resp_resposta.json()
        assert corpo["resposta"]["documentoEncontrado"] is True
        assert "Conteúdo de teste" in corpo["resposta"]["conteudo"]

        # Editar muda a resposta (troca de artigo) e é auditado com de/para.
        outro_documento_id = _criar_artigo(admin_headers, client, titulo="Segundo artigo de teste — apagar")
        resp_editar = client.put(
            f"/api/chatbot/perguntas/{pergunta['id']}",
            headers=admin_headers,
            json={"pergunta": "Como funciona o teste?", "categoria": "Teste", "documentoId": outro_documento_id, "ordem": 1, "ativo": False},
        )
        assert resp_editar.status_code == 200
        assert resp_editar.json()["ativo"] is False

        # Desativada: some da listagem de usuário comum, mas admin continua vendo.
        resp_lista_apos = client.get("/api/chatbot/perguntas", headers=user_headers)
        assert not any(p["id"] == pergunta["id"] for p in resp_lista_apos.json())
        resp_lista_admin = client.get("/api/chatbot/perguntas", headers=admin_headers)
        assert any(p["id"] == pergunta["id"] for p in resp_lista_admin.json())

        # E some do detalhe pra usuário comum (404), mas não pro admin.
        assert client.get(f"/api/chatbot/perguntas/{pergunta['id']}", headers=user_headers).status_code == 404
        assert client.get(f"/api/chatbot/perguntas/{pergunta['id']}", headers=admin_headers).status_code == 200

        resp_log = client.get("/api/logs?acao=chatbot_pergunta.editar&limit=5", headers=admin_headers)
        logs_da_pergunta = [log for log in resp_log.json() if log["entidadeId"] == pergunta["id"]]
        assert logs_da_pergunta
        assert logs_da_pergunta[0]["detalhes"]["documentoId"] == {"de": documento_id, "para": outro_documento_id}

        resp_excluir = client.delete(f"/api/chatbot/perguntas/{pergunta['id']}", headers=admin_headers)
        assert resp_excluir.status_code == 204
        assert client.get(f"/api/chatbot/perguntas/{pergunta['id']}", headers=admin_headers).status_code == 404
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM chatbot_perguntas WHERE categoria = 'Teste';")
                cur.execute("DELETE FROM base_conhecimento WHERE categoria = 'Teste';")
            conn.commit()


def test_pergunta_com_documento_apagado_nao_quebra(client, admin_headers):
    documento_id = _criar_artigo(admin_headers, client, titulo="Artigo que vai ser apagado — apagar")
    resp_criar = client.post(
        "/api/chatbot/perguntas",
        headers=admin_headers,
        json={"pergunta": "Pergunta órfã?", "categoria": "Teste", "documentoId": documento_id},
    )
    pergunta_id = resp_criar.json()["id"]

    try:
        assert client.delete(f"/api/base-conhecimento/{documento_id}", headers=admin_headers).status_code == 204

        resp = client.get(f"/api/chatbot/perguntas/{pergunta_id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["resposta"]["documentoEncontrado"] is False
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM chatbot_perguntas WHERE id = %s;", (pergunta_id,))
            conn.commit()
