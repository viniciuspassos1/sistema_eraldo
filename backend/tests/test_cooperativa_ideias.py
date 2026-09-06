"""PATCH /api/cooperativa-ideias/{id}: só administrador pode mudar o status
de uma ideia (fluxo tipo kanban) — antes qualquer usuário com acesso à
página conseguia mover a ideia de qualquer pessoa no funil."""

from database import get_connection


def test_usuario_comum_nao_muda_status_de_ideia(client, admin_headers, user_headers):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cooperativa_ideias (titulo, descricao, formato, tema)
                VALUES ('Teste automatizado', 'Descrição de teste.', 'Post', 'Tema de teste')
                RETURNING id;
                """
            )
            ideia_id = cur.fetchone()["id"]
        conn.commit()

    try:
        resp_user = client.patch(
            f"/api/cooperativa-ideias/{ideia_id}",
            headers=user_headers,
            json={"status": "APROVADA"},
        )
        assert resp_user.status_code == 403

        resp_admin = client.patch(
            f"/api/cooperativa-ideias/{ideia_id}",
            headers=admin_headers,
            json={"status": "APROVADA"},
        )
        assert resp_admin.status_code == 200
        assert resp_admin.json()["status"] == "APROVADA"
    finally:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM cooperativa_ideias WHERE id = %s;", (ideia_id,))
            conn.commit()
