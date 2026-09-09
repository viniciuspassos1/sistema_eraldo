"""GET /api/colaboradores exige sessão; POST/PUT/DELETE só admin."""


def test_listar_colaboradores_exige_sessao(client, api_key_header):
    resp = client.get("/api/colaboradores", headers=api_key_header)
    assert resp.status_code == 401


def test_listar_colaboradores_com_sessao_funciona(client, user_headers):
    resp = client.get("/api/colaboradores", headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_usuario_comum_nao_cria_colaborador(client, user_headers):
    resp = client.post(
        "/api/colaboradores", headers=user_headers, json={"nome": "Teste", "aniversario": "2000-01-01"}
    )
    assert resp.status_code == 403


def test_admin_cria_edita_e_exclui_colaborador(client, admin_headers):
    resp_criar = client.post(
        "/api/colaboradores",
        headers=admin_headers,
        json={"nome": "Colaborador Automatizado", "aniversario": "2000-06-15"},
    )
    assert resp_criar.status_code == 201
    corpo = resp_criar.json()
    assert corpo["nome"] == "Colaborador Automatizado"
    assert corpo["nomeCompleto"] is None
    assert corpo["restricaoAlimentar"] is None
    assert corpo["papel"] == "COLABORADOR"
    colaborador_id = corpo["id"]

    resp_editar = client.put(
        f"/api/colaboradores/{colaborador_id}",
        headers=admin_headers,
        json={
            "nome": "Colaborador Editado",
            "nomeCompleto": "Nome Completo Automatizado",
            "aniversario": "2000-06-15",
            "restricaoAlimentar": "Lactose",
            "papel": "ADMINISTRADOR",
        },
    )
    assert resp_editar.status_code == 200
    assert resp_editar.json()["nomeCompleto"] == "Nome Completo Automatizado"
    assert resp_editar.json()["restricaoAlimentar"] == "Lactose"
    assert resp_editar.json()["papel"] == "ADMINISTRADOR"

    resp_excluir = client.delete(f"/api/colaboradores/{colaborador_id}", headers=admin_headers)
    assert resp_excluir.status_code == 204

    resp_lista = client.get("/api/colaboradores", headers=admin_headers)
    assert colaborador_id not in {c["id"] for c in resp_lista.json()}
