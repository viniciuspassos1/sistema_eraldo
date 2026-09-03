"""IA generativa (Gemini) — este ambiente não tem GEMINI_API_KEY configurada
(nenhuma chave real foi fornecida para testar), então os testes cobrem só o
que dá para verificar sem depender do provedor: a rota existe, exige sessão
e devolve um erro claro (não uma tela quebrada) quando a IA não está
configurada. Envio de texto de verdade para o Gemini não foi testado."""

from llm import gemini_configurado


def test_gemini_nao_configurado_neste_ambiente():
    assert gemini_configurado() is False


def test_comunicacao_exige_sessao(client, api_key_header):
    resp = client.post("/api/assistant/comunicacao", headers=api_key_header, json={"pergunta": "teste"})
    assert resp.status_code == 401


def test_comunicacao_sem_chave_configurada_devolve_erro_claro(client, user_headers):
    resp = client.post("/api/assistant/comunicacao", headers=user_headers, json={"pergunta": "teste"})
    assert resp.status_code == 503
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_redigir_ideia_exige_sessao(client, api_key_header):
    resp = client.post(
        "/api/cooperativa-ideias/redigir",
        headers=api_key_header,
        json={"titulo": "teste", "formato": "Post", "tema": "Outro"},
    )
    assert resp.status_code == 401


def test_redigir_ideia_sem_chave_configurada_devolve_erro_claro(client, user_headers):
    resp = client.post(
        "/api/cooperativa-ideias/redigir",
        headers=user_headers,
        json={"titulo": "teste", "formato": "Post", "tema": "Outro"},
    )
    assert resp.status_code == 503
    assert "GEMINI_API_KEY" in resp.json()["detail"]
