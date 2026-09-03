"""Bloco de notas pessoal: cada usuário só vê/edita/apaga as próprias notas."""

from database import get_connection


def test_criar_listar_e_apagar_propria_nota(client, user_headers):
    resp_criar = client.post(
        "/api/notas-pessoais",
        headers=user_headers,
        json={"titulo": "Teste automatizado", "conteudo": "Apagar depois"},
    )
    assert resp_criar.status_code == 201
    nota = resp_criar.json()

    try:
        resp_listar = client.get("/api/notas-pessoais", headers=user_headers)
        assert resp_listar.status_code == 200
        assert any(n["id"] == nota["id"] for n in resp_listar.json())

        resp_editar = client.put(
            f"/api/notas-pessoais/{nota['id']}",
            headers=user_headers,
            json={"titulo": "Editado", "conteudo": "Conteúdo editado"},
        )
        assert resp_editar.status_code == 200
        assert resp_editar.json()["titulo"] == "Editado"
        assert resp_editar.json()["concluida"] is False

        resp_concluir = client.patch(
            f"/api/notas-pessoais/{nota['id']}/concluida",
            headers=user_headers,
            json={"concluida": True},
        )
        assert resp_concluir.status_code == 200
        assert resp_concluir.json()["concluida"] is True
    finally:
        resp_apagar = client.delete(f"/api/notas-pessoais/{nota['id']}", headers=user_headers)
        assert resp_apagar.status_code == 204


def test_nota_e_isolada_por_usuario(client, admin_headers, user_headers):
    resp_criar = client.post(
        "/api/notas-pessoais",
        headers=admin_headers,
        json={"titulo": "Nota do admin", "conteudo": "Privada"},
    )
    assert resp_criar.status_code == 201
    nota_id = resp_criar.json()["id"]

    try:
        # Outro usuário não vê a nota alheia na listagem.
        resp_listar_outro = client.get("/api/notas-pessoais", headers=user_headers)
        assert not any(n["id"] == nota_id for n in resp_listar_outro.json())

        # Nem consegue editar ou apagar (404, não vaza que existe pra outra pessoa).
        resp_editar_outro = client.put(
            f"/api/notas-pessoais/{nota_id}",
            headers=user_headers,
            json={"titulo": "invasão", "conteudo": "x"},
        )
        assert resp_editar_outro.status_code == 404

        resp_apagar_outro = client.delete(f"/api/notas-pessoais/{nota_id}", headers=user_headers)
        assert resp_apagar_outro.status_code == 404

        resp_concluir_outro = client.patch(
            f"/api/notas-pessoais/{nota_id}/concluida",
            headers=user_headers,
            json={"concluida": True},
        )
        assert resp_concluir_outro.status_code == 404
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM notas_pessoais WHERE id = %s;", (nota_id,))
            conn.commit()


def test_notas_pessoais_exige_sessao(client, api_key_header):
    resp = client.get("/api/notas-pessoais", headers=api_key_header)
    assert resp.status_code == 401
