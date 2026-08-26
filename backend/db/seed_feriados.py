"""
Migra os feriados/recessos que hoje vivem em
intranet-app/src/mocks/agenda.ts (export `holidays`) para a tabela
feriados no Supabase.

Uso:
    python -m db.seed_feriados

Idempotente: upsert por (nome, data_inicio).
"""

from database import get_connection, standalone_pool

FERIADOS = [
    ("Independência do Brasil", "2026-09-07", None, "FERIADO", True, None),
    ("Nossa Senhora Aparecida", "2026-10-12", None, "FERIADO", True, None),
    ("Finados", "2026-11-02", None, "FERIADO", True, None),
    ("Recesso de fim de ano", "2026-12-21", "2027-01-05", "RECESSO", True, "Retorno em 06/01"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            for nome, data_inicio, data_fim, tipo, fechado, observacao in FERIADOS:
                cur.execute(
                    """
                    INSERT INTO feriados (nome, data_inicio, data_fim, tipo, escritorio_fechado, observacao)
                    SELECT %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM feriados WHERE nome = %s AND data_inicio = %s
                    );
                    """,
                    (nome, data_inicio, data_fim, tipo, fechado, observacao, nome, data_inicio),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT nome, data_inicio, data_fim, tipo FROM feriados ORDER BY data_inicio;")
            rows = cur.fetchall()
        print(f"{len(rows)} feriado(s)/recesso(s) na tabela feriados:")
        for row in rows:
            print(f" - {row['nome']}: {row['data_inicio']}" + (f" a {row['data_fim']}" if row["data_fim"] else "") + f" ({row['tipo']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
