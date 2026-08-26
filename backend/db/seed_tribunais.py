"""
Migra os links que hoje vivem em intranet-app/src/mocks/courtLinks.ts para
a tabela tribunais no Supabase.

Uso:
    python -m db.seed_tribunais

Idempotente: upsert por nome.
"""

from database import get_connection, standalone_pool

TRIBUNAIS = [
    ("TJBA", "Tribunal de Justiça da Bahia", "https://www.tjba.jus.br", "Estadual"),
    ("TJRS", "Tribunal de Justiça do Rio Grande do Sul", "https://www.tjrs.jus.br", "Estadual"),
    ("TRF-1", "Tribunal Regional Federal da 1ª Região", "https://portal.trf1.jus.br", "Federal"),
    ("TRF-3", "Tribunal Regional Federal da 3ª Região", "https://www.trf3.jus.br", "Federal"),
    ("TRF-5", "Tribunal Regional Federal da 5ª Região", "https://www.trf5.jus.br", "Federal"),
    ("TST", "Tribunal Superior do Trabalho", "https://www.tst.jus.br", "Trabalhista"),
    ("TRT-5", "Tribunal Regional do Trabalho da 5ª Região", "https://www.trt5.jus.br", "Trabalhista"),
    ("STJ", "Superior Tribunal de Justiça", "https://www.stj.jus.br", "Superior"),
    ("STF", "Supremo Tribunal Federal", "https://www.stf.jus.br", "Superior"),
    ("INSS - Meu INSS", "Portal de serviços previdenciários", "https://meu.inss.gov.br", "Sistemas Externos"),
    ("PJe", "Processo Judicial Eletrônico", "https://pje.jus.br", "Sistemas Externos"),
    ("e-SAJ", "Sistema de Automação da Justiça", "https://esaj.tjba.jus.br", "Sistemas Externos"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            for nome, descricao, url, categoria in TRIBUNAIS:
                cur.execute(
                    """
                    INSERT INTO tribunais (nome, descricao, url, categoria)
                    SELECT %s, %s, %s, %s
                    WHERE NOT EXISTS (SELECT 1 FROM tribunais WHERE nome = %s);
                    """,
                    (nome, descricao, url, categoria, nome),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT nome, categoria FROM tribunais ORDER BY categoria, nome;")
            rows = cur.fetchall()
        print(f"{len(rows)} tribunal(is)/link(s) na tabela tribunais:")
        for row in rows:
            print(f" - {row['nome']} ({row['categoria']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
