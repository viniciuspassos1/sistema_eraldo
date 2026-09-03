"""IA generativa (Gemini). Este ambiente tem uma chave real configurada, então
os testes de "sem chave" simulam a ausência via monkeypatch (em vez de
depender do .env não ter uma) — e há também dois testes que confirmam uma
geração real, de ponta a ponta, contra o Gemini de verdade (cada execução da
suíte consome duas chamadas da cota gratuita)."""

import llm


def test_comunicacao_exige_sessao(client, api_key_header):
    resp = client.post("/api/assistant/comunicacao", headers=api_key_header, json={"pergunta": "teste"})
    assert resp.status_code == 401


def test_redigir_ideia_exige_sessao(client, api_key_header):
    resp = client.post(
        "/api/cooperativa-ideias/redigir",
        headers=api_key_header,
        json={"titulo": "teste", "formato": "Post", "tema": "Outro"},
    )
    assert resp.status_code == 401


def test_comunicacao_sem_chave_configurada_devolve_erro_claro(client, user_headers, monkeypatch):
    monkeypatch.setattr(llm, "GEMINI_API_KEY", "")
    resp = client.post("/api/assistant/comunicacao", headers=user_headers, json={"pergunta": "teste"})
    assert resp.status_code == 503
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_redigir_ideia_sem_chave_configurada_devolve_erro_claro(client, user_headers, monkeypatch):
    monkeypatch.setattr(llm, "GEMINI_API_KEY", "")
    resp = client.post(
        "/api/cooperativa-ideias/redigir",
        headers=user_headers,
        json={"titulo": "teste", "formato": "Post", "tema": "Outro"},
    )
    assert resp.status_code == 503
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_comunicacao_gera_texto_real(client, user_headers):
    resp = client.post(
        "/api/assistant/comunicacao",
        headers=user_headers,
        json={"pergunta": "Escreva uma frase curta de teste."},
    )
    assert resp.status_code == 200
    assert len(resp.json()["resposta"].strip()) > 0


def test_redigir_ideia_gera_descricao_real(client, user_headers):
    resp = client.post(
        "/api/cooperativa-ideias/redigir",
        headers=user_headers,
        json={"titulo": "Teste automatizado", "formato": "Post", "tema": "Outro"},
    )
    assert resp.status_code == 200
    assert len(resp.json()["descricaoSugerida"].strip()) > 0
