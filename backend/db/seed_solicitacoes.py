"""
Migra as solicitações que hoje vivem em intranet-app/src/mocks/agenda.ts
(export `requests`) para a tabela solicitacoes no Supabase.

Uso:
    python -m db.seed_solicitacoes

Idempotente: numero é UNIQUE no schema, então ON CONFLICT DO NOTHING evita duplicar.
"""

from database import get_connection, standalone_pool

FUNCIONARIO_EMAIL = {
    "Rafael Andrade": "rafael.andrade@proferaldojunior.com.br",
    "Carlos Eduardo Santos": "carlos.santos@proferaldojunior.com.br",
    "João Pedro Lima": "joao.lima@proferaldojunior.com.br",
    "Ana Beatriz Souza": "ana.souza@proferaldojunior.com.br",
    "Patrícia Gomes": "patricia.gomes@proferaldojunior.com.br",
    "Fernanda Oliveira": "fernanda.oliveira@proferaldojunior.com.br",
    "Mariana Costa": "mariana.costa@proferaldojunior.com.br",
    "Eraldo Júnior": "eraldo.junior@proferaldojunior.com.br",
}

SOLICITACOES = [
    ("SOL-0088", "Mariana Costa", "Atualização de documentação", "Atualizar modelo de petição previdenciária", "Eraldo Júnior", "2026-07-28", "RESOLVIDO"),
    ("SOL-0090", "Patrícia Gomes", "Solicitação de férias", "Férias de 01/09 a 15/09", "Fernanda Oliveira", "2026-08-05", "EM_ANALISE"),
    ("SOL-0091", "Rafael Andrade", "Suporte técnico", "Notebook não conecta ao Wi-Fi", "Carlos Eduardo Santos", "2026-08-10", "EM_ANDAMENTO"),
    ("SOL-0092", "João Pedro Lima", "Solicitação de documento", "Cópia de procuração assinada", "Ana Beatriz Souza", "2026-08-09", "ABERTO"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for numero, solicitante_nome, categoria, descricao, responsavel_nome, data_sol, status in SOLICITACOES:
                solicitante_id = id_por_email.get(FUNCIONARIO_EMAIL[solicitante_nome])
                responsavel_id = id_por_email.get(FUNCIONARIO_EMAIL[responsavel_nome])
                cur.execute(
                    """
                    INSERT INTO solicitacoes (numero, solicitante_id, categoria, descricao, responsavel_id, data, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (numero) DO NOTHING;
                    """,
                    (numero, solicitante_id, categoria, descricao, responsavel_id, data_sol, status),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT numero, categoria, status FROM solicitacoes ORDER BY numero;")
            rows = cur.fetchall()
        print(f"{len(rows)} solicitação(ões) na tabela solicitacoes:")
        for row in rows:
            print(f" - {row['numero']}: {row['categoria']} ({row['status']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
