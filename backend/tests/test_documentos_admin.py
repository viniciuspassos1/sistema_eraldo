"""POST/DELETE /api/documentos: só admin sobe e exclui documentos; o
download serve os bytes reais que foram enviados."""


def test_usuario_comum_nao_faz_upload(client, user_headers):
    resp = client.post(
        "/api/documentos",
        headers=user_headers,
        data={"titulo": "Teste", "categoria": "Jurídico"},
        files={"arquivo": ("teste.pdf", b"%PDF-1.4 conteudo de teste", "application/pdf")},
    )
    assert resp.status_code == 403


def test_admin_faz_upload_baixa_e_exclui_documento(client, admin_headers):
    conteudo = b"%PDF-1.4 conteudo de teste automatizado"
    resp_criar = client.post(
        "/api/documentos",
        headers=admin_headers,
        data={"titulo": "Documento automatizado", "categoria": "Jurídico", "tags": "teste,automatizado", "status": "PUBLICADO"},
        files={"arquivo": ("teste.pdf", conteudo, "application/pdf")},
    )
    assert resp_criar.status_code == 201
    documento_id = resp_criar.json()["id"]
    assert "teste" in resp_criar.json()["tags"]

    resp_baixar = client.get(f"/api/documentos/{documento_id}/arquivo", headers=admin_headers)
    assert resp_baixar.status_code == 200
    assert resp_baixar.content == conteudo

    # A inserção precisa ter deixado rastro completo na auditoria de logs —
    # é o ponto central do pedido de "Documento inserido" nos Logs.
    resp_logs = client.get("/api/logs?documento=Documento automatizado&limit=5", headers=admin_headers)
    assert resp_logs.status_code == 200
    logs_criacao = [l for l in resp_logs.json() if l["entidadeId"] == documento_id]
    assert len(logs_criacao) == 1
    log = logs_criacao[0]
    assert log["acao"] == "documento.criar"
    assert log["status"] == "SUCESSO"
    assert log["detalhes"]["documentoNome"] == "Documento automatizado"
    assert log["detalhes"]["documentoTipo"] == "PDF"
    assert log["detalhes"]["tamanhoBytes"] == len(conteudo)

    resp_excluir = client.delete(f"/api/documentos/{documento_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204

    # Exclusão também registra o nome do documento removido (buscado antes
    # do DELETE, já que depois não existe mais pra consultar).
    resp_logs_excluir = client.get("/api/logs?acao=documento.excluir&limit=5", headers=admin_headers)
    log_excluir = next(l for l in resp_logs_excluir.json() if l["entidadeId"] == documento_id)
    assert log_excluir["status"] == "SUCESSO"
    assert log_excluir["detalhes"]["documentoNome"] == "Documento automatizado"


def test_upload_rejeita_tipo_nao_permitido(client, admin_headers):
    resp = client.post(
        "/api/documentos",
        headers=admin_headers,
        data={"titulo": "Teste tipo invalido", "categoria": "Jurídico"},
        files={"arquivo": ("teste.exe", b"conteudo", "application/x-msdownload")},
    )
    assert resp.status_code == 400

    # Tentativa rejeitada também vira log, com status ERRO — auditoria
    # cobre tentativas que falharam, não só sucesso.
    resp_logs = client.get("/api/logs?documento=Teste tipo invalido&status=ERRO&limit=5", headers=admin_headers)
    assert resp_logs.status_code == 200
    assert len(resp_logs.json()) >= 1
    assert resp_logs.json()[0]["detalhes"]["erro"] == "Tipo de arquivo não permitido."
