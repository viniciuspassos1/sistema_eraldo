"""Upload de atestado: validação de tipo de arquivo e isolamento entre usuários
(dado de saúde é sensível — ninguém além do dono e de um admin pode acessar)."""

import io

from database import get_connection

OUTRO_USUARIO_EMAIL = "carlos.santos@proferaldojunior.com.br"
OUTRO_USUARIO_SENHA = "8QQqF1FxVwLC"


def test_upload_tipo_de_arquivo_nao_permitido_e_rejeitado(client, api_key_header, user_headers):
    resp = client.post(
        "/api/atestados",
        headers=user_headers,
        data={"dataInicio": "2026-09-01", "dataFim": "2026-09-02"},
        files={"arquivo": ("malicioso.html", io.BytesIO(b"<script>alert(1)</script>"), "text/html")},
    )
    assert resp.status_code == 400


def test_upload_pdf_valido_e_isolamento_de_acesso(client, api_key_header, admin_headers, user_headers):
    resp_criar = client.post(
        "/api/atestados",
        headers=user_headers,
        data={"dataInicio": "2026-09-01", "dataFim": "2026-09-02", "motivo": "Teste automatizado"},
        files={"arquivo": ("atestado.pdf", io.BytesIO(b"%PDF-1.4 conteudo de teste"), "application/pdf")},
    )
    assert resp_criar.status_code == 201
    atestado_id = resp_criar.json()["id"]

    try:
        # O dono acessa o próprio arquivo.
        resp_dono = client.get(f"/api/atestados/{atestado_id}/arquivo", headers=user_headers)
        assert resp_dono.status_code == 200
        assert resp_dono.headers["content-disposition"].startswith("attachment")

        # Outro funcionário (não é dono, não é admin) não acessa.
        outro_login = client.post(
            "/api/auth/login",
            headers=api_key_header,
            json={"email": OUTRO_USUARIO_EMAIL, "senha": OUTRO_USUARIO_SENHA},
        )
        assert outro_login.status_code == 200
        outro_token = outro_login.json()["token"]
        resp_outro = client.get(
            f"/api/atestados/{atestado_id}/arquivo",
            headers={**api_key_header, "Authorization": f"Bearer {outro_token}"},
        )
        assert resp_outro.status_code == 403

        # Administrador acessa qualquer atestado.
        resp_admin = client.get(f"/api/atestados/{atestado_id}/arquivo", headers=admin_headers)
        assert resp_admin.status_code == 200
    finally:
        # Não existe endpoint de exclusão de atestado (por desenho — é um
        # registro histórico); a limpeza do dado de teste é feita direto no
        # banco, igual ao padrão já usado nos testes manuais deste projeto.
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM atestados WHERE id = %s;", (atestado_id,))
            conn.commit()
