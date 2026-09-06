"""Proteções que valem pra API inteira: rate limit geral por IP, headers de
segurança HTTP e um handler central que transforma um {id} de rota que não
é um UUID válido em 404 (em vez do 500 genérico) mesmo nos routers que não
tratam isso na mão."""

from collections import defaultdict

import security


def test_rate_limit_geral_bloqueia_apos_o_limite(client, monkeypatch):
    # Troca o contador global por um vazio e baixa o limite só pra este
    # teste — não usa o contador real (que já acumulou requisições de todo
    # o resto da suíte) nem deixa efeito colateral pros testes seguintes.
    monkeypatch.setattr(security, "_requisicoes_por_ip", defaultdict(list))
    monkeypatch.setattr(security, "_MAX_REQUISICOES_POR_MINUTO", 3)

    for _ in range(3):
        resp = client.get("/api/health")
        assert resp.status_code == 200

    resp_bloqueado = client.get("/api/health")
    assert resp_bloqueado.status_code == 429


def test_resposta_inclui_headers_de_seguranca(client, api_key_header):
    resp = client.get("/api/health")
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "max-age" in resp.headers["strict-transport-security"]


def test_id_invalido_em_rota_sem_tratamento_proprio_vira_404(client, user_headers):
    # avisos.marcar_lido não captura InvalidTextRepresentation na própria
    # rota — depende do handler global (ver main.py:id_invalido_handler).
    resp = client.post("/api/avisos/isso-nao-e-um-uuid/marcar-lido", headers=user_headers)
    assert resp.status_code == 404
