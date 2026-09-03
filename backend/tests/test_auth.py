"""Login, sessão (JWT) e bloqueio por tentativas incorretas."""

from tests.conftest import USER_EMAIL, USER_SENHA


def test_login_sucesso(client, api_key_header):
    resp = client.post(
        "/api/auth/login",
        headers=api_key_header,
        json={"email": USER_EMAIL, "senha": USER_SENHA},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "token" in body
    assert body["usuario"]["email"] == USER_EMAIL
    assert "senhaHash" not in body["usuario"]
    assert "senha_hash" not in body["usuario"]


def test_login_senha_errada(client, api_key_header):
    resp = client.post(
        "/api/auth/login",
        headers=api_key_header,
        json={"email": USER_EMAIL, "senha": "senha-completamente-errada"},
    )
    assert resp.status_code == 401


def test_login_email_inexistente_mesma_mensagem_de_senha_errada(client, api_key_header):
    """Não deve dar pra descobrir se um e-mail existe pela mensagem de erro."""
    resp_inexistente = client.post(
        "/api/auth/login",
        headers=api_key_header,
        json={"email": "ninguem-com-esse-email@proferaldojunior.com.br", "senha": "qualquer"},
    )
    resp_senha_errada = client.post(
        "/api/auth/login",
        headers=api_key_header,
        json={"email": USER_EMAIL, "senha": "senha-errada-de-novo"},
    )
    assert resp_inexistente.status_code == 401
    assert resp_senha_errada.status_code == 401
    assert resp_inexistente.json()["detail"] == resp_senha_errada.json()["detail"]


def test_login_sem_api_key_e_recusado(client):
    resp = client.post("/api/auth/login", json={"email": USER_EMAIL, "senha": USER_SENHA})
    assert resp.status_code == 401


def test_login_bloqueia_apos_5_tentativas_incorretas(client, api_key_header):
    email_descartavel = "conta-de-teste-rate-limit@proferaldojunior.com.br"

    for _ in range(5):
        resp = client.post(
            "/api/auth/login",
            headers=api_key_header,
            json={"email": email_descartavel, "senha": "errada"},
        )
        assert resp.status_code == 401

    resp_bloqueado = client.post(
        "/api/auth/login",
        headers=api_key_header,
        json={"email": email_descartavel, "senha": "errada"},
    )
    assert resp_bloqueado.status_code == 429


def test_me_sem_token_e_recusado(client, api_key_header):
    resp = client.get("/api/auth/me", headers=api_key_header)
    assert resp.status_code == 401


def test_me_com_token_valido(client, api_key_header, user_token):
    resp = client.get(
        "/api/auth/me",
        headers={**api_key_header, "Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == USER_EMAIL


def test_me_com_token_adulterado_e_recusado(client, api_key_header, user_token):
    resp = client.get(
        "/api/auth/me",
        headers={**api_key_header, "Authorization": f"Bearer {user_token}adulterado"},
    )
    assert resp.status_code == 401
