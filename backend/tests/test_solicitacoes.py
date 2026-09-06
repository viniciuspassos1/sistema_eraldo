"""Geração do número sequencial de solicitação (SOL-0001, SOL-0002, ...):
precisa ser única mesmo sob concorrência — ver pg_advisory_xact_lock em
_proximo_numero (backend/routers/solicitacoes.py)."""

from concurrent.futures import ThreadPoolExecutor

from database import get_connection


def test_numeros_de_solicitacoes_concorrentes_sao_unicos(client, user_headers):
    ids_criados = []
    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            respostas = list(
                pool.map(
                    lambda _: client.post(
                        "/api/solicitacoes",
                        headers=user_headers,
                        json={"categoria": "Suporte técnico", "descricao": "Teste de concorrência — apagar"},
                    ),
                    range(8),
                )
            )

        for resp in respostas:
            assert resp.status_code == 201
            ids_criados.append(resp.json()["id"])

        numeros = [resp.json()["numero"] for resp in respostas]
        assert len(numeros) == len(set(numeros)), f"números duplicados: {numeros}"
    finally:
        if ids_criados:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM solicitacoes WHERE id = ANY(%s::uuid[]);", (ids_criados,))
                conn.commit()
