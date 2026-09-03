"""
Suíte de testes automatizados do backend.

Roda contra o banco real (Supabase) usando as contas de demonstração já
semeadas — não existe banco de teste separado neste projeto. Por isso,
todo teste que cria dado precisa apagar o que criou (ver fixtures que
fazem yield + cleanup abaixo) e nenhum teste deve alterar dados de conta
que outras pessoas usam para navegar na intranet.

Rodar com: cd backend && ./venv/Scripts/python.exe -m pytest
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from config import API_KEY

ADMIN_EMAIL = "eraldo.junior@proferaldojunior.com.br"
ADMIN_SENHA = "IntranetEJ@2026"

# Conta de funcionário comum (perfil FUNCIONARIO) usada nos testes que
# precisam de "alguém sem privilégio admin" — não usar a Mariana aqui:
# ela é usada manualmente durante o desenvolvimento e pode estar com
# tentativas de login acumuladas.
USER_EMAIL = "joao.lima@proferaldojunior.com.br"
USER_SENHA = "BeiRNvkueBof"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def api_key_header():
    assert API_KEY, "API_KEY não configurada no .env — necessário para rodar os testes"
    return {"X-API-Key": API_KEY}


def _login(client, api_key_header, email, senha):
    resp = client.post(
        "/api/auth/login",
        headers=api_key_header,
        json={"email": email, "senha": senha, "manterConectado": False},
    )
    assert resp.status_code == 200, f"login falhou para {email}: {resp.status_code} {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="session")
def admin_token(client, api_key_header):
    return _login(client, api_key_header, ADMIN_EMAIL, ADMIN_SENHA)


@pytest.fixture(scope="session")
def user_token(client, api_key_header):
    return _login(client, api_key_header, USER_EMAIL, USER_SENHA)


@pytest.fixture
def admin_headers(api_key_header, admin_token):
    return {**api_key_header, "Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def user_headers(api_key_header, user_token):
    return {**api_key_header, "Authorization": f"Bearer {user_token}"}
