"""GET/POST /api/backups: só admin acessa.

Não testamos aqui o POST realmente disparando um backup (executaria
pg_dump de verdade, dependendo do binário estar no PATH do ambiente que
roda a suíte — não é uma dependência que faz sentido a suíte assumir).
A lógica de execução (pg_dump, trava de concorrência, backup travado,
retenção) tem verificação própria — ver backend/backup.py."""


def test_listar_backups_exige_admin(client, user_headers):
    resp = client.get("/api/backups", headers=user_headers)
    assert resp.status_code == 403


def test_admin_lista_backups(client, admin_headers):
    resp = client.get("/api/backups", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_disparar_backup_exige_admin(client, user_headers):
    resp = client.post("/api/backups", headers=user_headers)
    assert resp.status_code == 403
