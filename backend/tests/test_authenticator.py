"""Códigos TOTP de /api/authenticator/codes: AUTH_SERVICE_N_PERFIS (opcional)
restringe um serviço a perfis específicos — sem essa variável, o serviço
continua visível pra qualquer um com acesso à página (comportamento
anterior). ADMINISTRADOR sempre vê todos os serviços, com ou sem restrição."""

import os


def test_sem_perfis_definido_servico_e_visivel_a_qualquer_um_com_acesso(client, user_headers):
    os.environ.pop("AUTH_SERVICE_1_PERFIS", None)
    resp = client.get("/api/authenticator/codes", headers=user_headers)
    assert resp.status_code == 200
    assert len(resp.json()["services"]) >= 1


def test_perfis_restringe_servico_para_usuario_comum_mas_nao_para_admin(client, admin_headers, user_headers):
    os.environ["AUTH_SERVICE_1_PERFIS"] = "ADMINISTRADOR"
    try:
        resp_user = client.get("/api/authenticator/codes", headers=user_headers)
        assert resp_user.status_code == 404

        resp_admin = client.get("/api/authenticator/codes", headers=admin_headers)
        assert resp_admin.status_code == 200
        assert len(resp_admin.json()["services"]) >= 1
    finally:
        os.environ.pop("AUTH_SERVICE_1_PERFIS", None)
