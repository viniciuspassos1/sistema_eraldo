"""CRUD de admin nos catálogos simples: tribunais, feriados, férias e
agenda_eventos. Todos seguem o mesmo padrão (só admin escreve), então um
teste por domínio já cobre o essencial."""


def test_tribunais_crud_admin(client, admin_headers, user_headers):
    resp_negado = client.post(
        "/api/tribunais",
        headers=user_headers,
        json={"nome": "Teste", "descricao": "Teste", "url": "https://exemplo.com", "categoria": "Federal"},
    )
    assert resp_negado.status_code == 403

    resp_criar = client.post(
        "/api/tribunais",
        headers=admin_headers,
        json={"nome": "Tribunal Automatizado", "descricao": "Teste.", "url": "https://exemplo.com", "categoria": "Federal"},
    )
    assert resp_criar.status_code == 201
    tribunal_id = resp_criar.json()["id"]

    resp_editar = client.put(
        f"/api/tribunais/{tribunal_id}",
        headers=admin_headers,
        json={"nome": "Tribunal Editado", "descricao": "Editado.", "url": "https://exemplo.com", "categoria": "Estadual"},
    )
    assert resp_editar.status_code == 200
    assert resp_editar.json()["nome"] == "Tribunal Editado"

    resp_excluir = client.delete(f"/api/tribunais/{tribunal_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204


def test_feriados_crud_admin(client, admin_headers, user_headers):
    resp_negado = client.post(
        "/api/feriados", headers=user_headers, json={"nome": "Teste", "dataInicio": "2026-12-25"}
    )
    assert resp_negado.status_code == 403

    resp_criar = client.post(
        "/api/feriados", headers=admin_headers, json={"nome": "Feriado Automatizado", "dataInicio": "2026-12-25", "tipo": "FERIADO"}
    )
    assert resp_criar.status_code == 201
    feriado_id = resp_criar.json()["id"]

    resp_excluir = client.delete(f"/api/feriados/{feriado_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204


def test_ferias_crud_admin(client, admin_headers, user_headers):
    resp_me = client.get("/api/auth/me", headers=user_headers)
    user_id = resp_me.json()["id"]

    resp_negado = client.post(
        "/api/ferias", headers=user_headers, json={"funcionarioId": user_id, "inicio": "2026-12-01", "fim": "2026-12-15"}
    )
    assert resp_negado.status_code == 403

    resp_criar = client.post(
        "/api/ferias", headers=admin_headers, json={"funcionarioId": user_id, "inicio": "2026-12-01", "fim": "2026-12-15"}
    )
    assert resp_criar.status_code == 201
    ferias_id = resp_criar.json()["id"]

    resp_excluir = client.delete(f"/api/ferias/{ferias_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204


def test_agenda_eventos_crud_admin(client, admin_headers, user_headers):
    resp_negado = client.post(
        "/api/agenda/eventos",
        headers=user_headers,
        json={"titulo": "Teste", "tipo": "REUNIAO", "data": "2026-12-01", "horario": "10:00"},
    )
    assert resp_negado.status_code == 403

    resp_criar = client.post(
        "/api/agenda/eventos",
        headers=admin_headers,
        json={"titulo": "Evento Automatizado", "tipo": "REUNIAO", "data": "2026-12-01", "horario": "10:00"},
    )
    assert resp_criar.status_code == 201
    evento_id = resp_criar.json()["id"]

    resp_excluir = client.delete(f"/api/agenda/eventos/{evento_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204
