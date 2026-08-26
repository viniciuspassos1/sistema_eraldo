"""
Migra as ideias que hoje vivem em intranet-app/src/mocks/ideias.ts para a
tabela cooperativa_ideias no Supabase.

Uso:
    python -m db.seed_cooperativa_ideias

Idempotente: upsert por titulo.
"""

from database import get_connection, standalone_pool

FUNCIONARIO_EMAIL = {
    "Mariana Costa": "mariana.costa@proferaldojunior.com.br",
    "Fernanda Oliveira": "fernanda.oliveira@proferaldojunior.com.br",
    "Ana Beatriz Souza": "ana.souza@proferaldojunior.com.br",
    "Rafael Andrade": "rafael.andrade@proferaldojunior.com.br",
    "Patrícia Gomes": "patricia.gomes@proferaldojunior.com.br",
    "João Pedro Lima": "joao.lima@proferaldojunior.com.br",
}

IDEIAS = [
    ("5 erros que podem prejudicar uma ação trabalhista",
     "Vídeo curto explicando cinco erros comuns cometidos por trabalhadores antes de procurar um advogado.",
     "Reels", "Tema jurídico", None, "Mariana Costa", "2026-08-05", "EM_PRODUCAO"),
    ("Mitos e verdades sobre pensão alimentícia",
     "Carrossel desmentindo crenças comuns sobre valor, prazo e revisão de pensão alimentícia.",
     "Post", "Conteúdo educativo", "Perfis de direito de família costumam usar esse formato de carrossel.",
     "Fernanda Oliveira", "2026-08-07", "APROVADA"),
    ("Bastidores do escritório no Dia do Advogado",
     "Stories mostrando a equipe no dia 11 de agosto, com depoimentos curtos sobre a profissão.",
     "Stories", "Data comemorativa", None, "Ana Beatriz Souza", "2026-08-08", "PUBLICADA"),
    ("O que fazer após sofrer um acidente de trabalho?",
     "Vídeo educativo com o passo a passo imediato: atendimento médico, CAT, documentação e prazos.",
     "Vídeo", "Pergunta frequente de cliente", None, "Rafael Andrade", "2026-08-09", "EM_ANALISE"),
    ("Como funciona a licença maternidade em 2026",
     "Post explicativo com prazos atualizados e direitos garantidos por lei.",
     "Post", "Tendência/assunto em destaque", None, "Patrícia Gomes", "2026-08-10", "NOVA"),
    ("Golpe do falso INSS: como identificar",
     "Conteúdo de alerta sobre golpes recentes envolvendo aposentadoria e benefícios do INSS.",
     "Reels", "Tendência/assunto em destaque", None, "João Pedro Lima", "2026-08-04", "NAO_APROVADA"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for titulo, descricao, formato, tema, referencia, autor_nome, data_ideia, status in IDEIAS:
                autor_id = id_por_email.get(FUNCIONARIO_EMAIL[autor_nome])
                cur.execute(
                    """
                    INSERT INTO cooperativa_ideias (titulo, descricao, formato, tema, referencia, autor_id, data, status)
                    SELECT %s, %s, %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (SELECT 1 FROM cooperativa_ideias WHERE titulo = %s);
                    """,
                    (titulo, descricao, formato, tema, referencia, autor_id, data_ideia, status, titulo),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT titulo, status FROM cooperativa_ideias ORDER BY data DESC;")
            rows = cur.fetchall()
        print(f"{len(rows)} ideia(s) na tabela cooperativa_ideias:")
        for row in rows:
            print(f" - {row['titulo']} ({row['status']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
