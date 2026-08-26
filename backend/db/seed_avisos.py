"""
Migra os avisos que hoje vivem em intranet-app/src/mocks/announcements.ts
para a tabela avisos no Supabase.

Uso:
    python -m db.seed_avisos

Idempotente: upsert por (titulo, data).
"""

from database import get_connection, standalone_pool

FUNCIONARIO_EMAIL = {
    "Fernanda Oliveira": "fernanda.oliveira@proferaldojunior.com.br",
    "Eraldo Júnior": "eraldo.junior@proferaldojunior.com.br",
    "Carlos Eduardo Santos": "carlos.santos@proferaldojunior.com.br",
}

AVISOS = [
    ("Recesso de fim de ano atualizado",
     "O período de recesso deste ano foi ajustado para 21/12 a 05/01. Consulte o calendário de feriados para mais detalhes.",
     "Fernanda Oliveira", "2026-08-10", "ADMINISTRATIVO", "Todos"),
    ("Novo funcionário: Rafael Andrade",
     "Demos boas-vindas ao Rafael Andrade, novo estagiário do setor Previdenciário.",
     "Fernanda Oliveira", "2026-08-06", "INFORMATIVO", "Todos"),
    ("Manual interno atualizado",
     "O capítulo de Atendimento ao Cliente foi revisado. Recomendamos a leitura de todos os colaboradores.",
     "Eraldo Júnior", "2026-08-04", "JURIDICO", "Jurídico"),
    ("Manutenção programada no sistema",
     "Na madrugada de sábado o sistema ficará indisponível das 00h às 03h para manutenção.",
     "Carlos Eduardo Santos", "2026-08-01", "TECNOLOGIA", "Todos"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for titulo, conteudo, autor_nome, data_aviso, prioridade, publico in AVISOS:
                autor_id = id_por_email.get(FUNCIONARIO_EMAIL[autor_nome])
                cur.execute(
                    """
                    INSERT INTO avisos (titulo, conteudo, autor_id, data, prioridade, publico)
                    SELECT %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM avisos WHERE titulo = %s AND data = %s
                    );
                    """,
                    (titulo, conteudo, autor_id, data_aviso, prioridade, publico, titulo, data_aviso),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT titulo, data, prioridade FROM avisos ORDER BY data DESC;")
            rows = cur.fetchall()
        print(f"{len(rows)} aviso(s) na tabela avisos:")
        for row in rows:
            print(f" - {row['titulo']} ({row['data']}, {row['prioridade']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
