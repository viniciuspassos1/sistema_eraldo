"""GET /api/pendencias agrega onboarding, solicitações e atestados do próprio
usuário (e, para admin, o que precisa de aprovação/atenção de terceiros)."""

from datetime import date, timedelta

from database import get_connection


def test_pendencias_exige_sessao(client, api_key_header):
    resp = client.get("/api/pendencias", headers=api_key_header)
    assert resp.status_code == 401


def test_solicitacao_propria_em_andamento_aparece_como_pendencia(client, admin_headers):
    resp_admin = client.get("/api/auth/me", headers=admin_headers)
    admin_id = resp_admin.json()["id"]

    solicitacao_id = None
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO solicitacoes (numero, solicitante_id, categoria, descricao, data, status)
                    VALUES ('SOL-TESTE-8888', %s, 'Suporte técnico', 'Teste automatizado — apagar', %s, 'ABERTO')
                    RETURNING id;
                    """,
                    (admin_id, date.today() - timedelta(days=1)),
                )
                solicitacao_id = cur.fetchone()["id"]
            conn.commit()

        resp = client.get("/api/pendencias", headers=admin_headers)
        assert resp.status_code == 200
        pendencias = resp.json()
        assert any(p["tipo"] == "SOLICITACAO" and "andamento" in p["mensagem"] for p in pendencias)
        # Sem responsável: também deve aparecer o alerta administrativo (mesmo usuário é admin aqui).
        assert any("sem responsável" in p["mensagem"] for p in pendencias)
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if solicitacao_id:
                    cur.execute("DELETE FROM solicitacoes WHERE id = %s;", (solicitacao_id,))
            conn.commit()


def test_usuario_comum_nao_ve_pendencias_administrativas(client, user_headers):
    resp = client.get("/api/pendencias", headers=user_headers)
    assert resp.status_code == 200
    pendencias = resp.json()
    assert not any("triagem" in p["mensagem"] or "aguardando sua aprovação" in p["mensagem"] for p in pendencias)


def test_onboarding_pendente_so_aparece_para_administrador(client, user_headers):
    resp = client.get("/api/pendencias", headers=user_headers)
    assert resp.status_code == 200
    assert not any(p["tipo"] == "ONBOARDING" for p in resp.json())


def test_anotacao_pendente_aparece_como_pendencia(client, user_headers):
    resp_criar = client.post(
        "/api/notas-pessoais",
        headers=user_headers,
        json={"titulo": "Teste automatizado", "conteudo": "Apagar depois"},
    )
    assert resp_criar.status_code == 201
    nota_id = resp_criar.json()["id"]

    try:
        resp = client.get("/api/pendencias", headers=user_headers)
        assert resp.status_code == 200
        pendencias = resp.json()
        assert any(p["tipo"] == "ANOTACAO" and "anotaç" in p["mensagem"] for p in pendencias)
    finally:
        client.delete(f"/api/notas-pessoais/{nota_id}", headers=user_headers)
