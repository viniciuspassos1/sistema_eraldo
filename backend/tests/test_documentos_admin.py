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

    resp_excluir = client.delete(f"/api/documentos/{documento_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204


def test_upload_rejeita_tipo_nao_permitido(client, admin_headers):
    resp = client.post(
        "/api/documentos",
        headers=admin_headers,
        data={"titulo": "Teste", "categoria": "Jurídico"},
        files={"arquivo": ("teste.exe", b"conteudo", "application/x-msdownload")},
    )
    assert resp.status_code == 400
