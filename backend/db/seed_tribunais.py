"""
Popula/atualiza a tabela tribunais no Supabase.

Uso:
    python -m db.seed_tribunais

Idempotente por nome: se já existe, atualiza descrição/url/categoria; se
não existe, insere. Rodar de novo depois de editar TRIBUNAIS aqui é o
jeito de corrigir um link (ex.: quando o escritório manda a URL certa).
"""

from database import get_connection, standalone_pool

TRIBUNAIS = [
    ("TJBA", "Tribunal de Justiça da Bahia", "https://www.tjba.jus.br", "Estadual"),
    ("TJRS", "Tribunal de Justiça do Rio Grande do Sul", "https://www.tjrs.jus.br", "Estadual"),
    ("TRF-1", "Tribunal Regional Federal da 1ª Região — PJe", "https://pje1g.trf1.jus.br/pje/login.seam", "Federal"),
    ("TRF-2", "Tribunal Regional Federal da 2ª Região — eproc", "https://eproc.trf2.jus.br/eproc/", "Federal"),
    (
        "TRF-3",
        "Tribunal Regional Federal da 3ª Região — Quadro de Avisos (PJe)",
        "https://pje1g.trf3.jus.br/pje/QuadroAviso/listViewQuadroAvisoMensagem.seam",
        "Federal",
    ),
    (
        "TRF-4",
        "Tribunal Regional Federal da 4ª Região",
        "https://www.trf4.jus.br/trf4/controlador.php?acao=pagina_menu_listar&id_pai=264",
        "Federal",
    ),
    ("TRF-5", "Tribunal Regional Federal da 5ª Região — PJe", "https://pje1g.trf5.jus.br/pje/login.seam", "Federal"),
    ("TRF-6", "Tribunal Regional Federal da 6ª Região — eproc", "https://eproc1g.trf6.jus.br/eproc/", "Federal"),
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
                cur.execute("SELECT id FROM tribunais WHERE nome = %s;", (nome,))
                existente = cur.fetchone()
                if existente:
                    cur.execute(
                        "UPDATE tribunais SET descricao = %s, url = %s, categoria = %s WHERE id = %s;",
                        (descricao, url, categoria, existente["id"]),
                    )
                else:
                    cur.execute(
                        "INSERT INTO tribunais (nome, descricao, url, categoria) VALUES (%s, %s, %s, %s);",
                        (nome, descricao, url, categoria),
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
