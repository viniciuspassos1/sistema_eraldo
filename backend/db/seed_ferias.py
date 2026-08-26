"""
Migra os períodos de férias que hoje vivem em
intranet-app/src/mocks/vacations.ts para a tabela ferias no Supabase.

Uso:
    python -m db.seed_ferias

Precisa rodar depois do seed_usuarios.py — busca o funcionario_id real
(UUID) pelo e-mail, já que o mock antigo usava ids tipo "u1".

Não é idempotente por linha (não há uma chave natural única em ferias
além do id gerado) — rodar de novo duplica. Se precisar reprocessar,
apague as linhas antigas primeiro.
"""

from database import get_connection, standalone_pool

# Mapeia o funcionarioId antigo do mock para o e-mail (chave estável em usuarios).
FUNCIONARIO_EMAIL = {
    "u1": "eraldo.junior@proferaldojunior.com.br",
    "u4": "ana.souza@proferaldojunior.com.br",
    "u5": "carlos.santos@proferaldojunior.com.br",
    "u7": "rafael.andrade@proferaldojunior.com.br",
}

FERIAS = [
    ("u4", "2026-08-04", "2026-08-18", "EM_ANDAMENTO"),
    ("u1", "2026-09-10", "2026-09-20", "AGENDADA"),
    ("u5", "2026-09-01", "2026-09-15", "AGENDADA"),
    ("u7", "2026-07-01", "2026-07-15", "CONCLUIDA"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for funcionario_id_mock, inicio, fim, status in FERIAS:
                email = FUNCIONARIO_EMAIL[funcionario_id_mock]
                funcionario_id = id_por_email.get(email)
                if not funcionario_id:
                    print(f"AVISO: usuário {email} não encontrado, pulando.")
                    continue
                cur.execute(
                    """
                    INSERT INTO ferias (funcionario_id, inicio, fim, status)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (funcionario_id, inicio, fim, status),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.nome, f.inicio, f.fim, f.status
                FROM ferias f JOIN usuarios u ON u.id = f.funcionario_id
                ORDER BY f.inicio;
                """
            )
            rows = cur.fetchall()
        print(f"{len(rows)} período(s) de férias na tabela ferias:")
        for row in rows:
            print(f" - {row['nome']}: {row['inicio']} a {row['fim']} ({row['status']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
