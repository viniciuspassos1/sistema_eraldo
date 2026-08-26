"""
Migra os artigos que hoje vivem em intranet-app/src/mocks/knowledgeBase.ts
para a tabela base_conhecimento no Supabase.

Uso:
    python -m db.seed_base_conhecimento

Idempotente: upsert por titulo.
"""

from database import get_connection, standalone_pool

FUNCIONARIO_EMAIL = {
    "Eraldo Júnior": "eraldo.junior@proferaldojunior.com.br",
    "Ana Beatriz Souza": "ana.souza@proferaldojunior.com.br",
    "Carlos Eduardo Santos": "carlos.santos@proferaldojunior.com.br",
    "Fernanda Oliveira": "fernanda.oliveira@proferaldojunior.com.br",
}

ARTIGOS = [
    ("Procedimento para abertura de novo processo previdenciário", "Jurídico",
     "Ao receber um novo caso previdenciário, o advogado responsável deve: 1) Cadastrar o cliente no sistema; "
     "2) Reunir documentação (CNIS, RG, comprovante de residência); 3) Analisar o tipo de benefício cabível; "
     "4) Protocolar a petição inicial no prazo de até 5 dias úteis após a reunião com o cliente.",
     "Eraldo Júnior", "PUBLICADO", ["previdenciário", "procedimento", "processo"]),
    ("Como funciona o atendimento ao cliente", "Atendimento",
     "O primeiro contato deve ser respondido em até 24h úteis. Toda dúvida sobre andamento processual deve ser "
     "repassada ao advogado responsável pelo caso. Reclamações devem ser registradas na Central de Solicitações.",
     "Ana Beatriz Souza", "PUBLICADO", ["atendimento", "cliente"]),
    ("FAQ - Sistemas utilizados pelo escritório", "Sistemas",
     "O escritório utiliza PJe para processos federais e trabalhistas, e-SAJ para processos estaduais na Bahia, "
     "e Meu INSS para consultas de benefícios. Credenciais de acesso são de responsabilidade individual e não "
     "devem ser compartilhadas.",
     "Carlos Eduardo Santos", "PUBLICADO", ["sistemas", "faq", "ti"]),
    ("Política de férias e escala", "Recursos Humanos",
     "As férias devem ser solicitadas com no mínimo 30 dias de antecedência através da Central de Solicitações. "
     "O RH confirma a escala considerando a cobertura mínima do setor.",
     "Fernanda Oliveira", "PUBLICADO", ["rh", "férias"]),
    ("Procedimento financeiro - reembolso de despesas", "Financeiro",
     "Despesas de deslocamento para audiências e diligências devem ser lançadas na planilha de reembolso e "
     "enviadas ao setor financeiro até o dia 25 de cada mês, com nota fiscal ou recibo anexado.",
     "Carlos Eduardo Santos", "PUBLICADO", ["financeiro", "reembolso"]),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for titulo, categoria, conteudo, autor_nome, status, tags in ARTIGOS:
                autor_id = id_por_email.get(FUNCIONARIO_EMAIL[autor_nome])
                cur.execute(
                    """
                    INSERT INTO base_conhecimento (titulo, categoria, conteudo, autor_id, status, tags)
                    SELECT %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (SELECT 1 FROM base_conhecimento WHERE titulo = %s);
                    """,
                    (titulo, categoria, conteudo, autor_id, status, tags, titulo),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT titulo, categoria FROM base_conhecimento ORDER BY titulo;")
            rows = cur.fetchall()
        print(f"{len(rows)} artigo(s) na tabela base_conhecimento:")
        for row in rows:
            print(f" - {row['titulo']} ({row['categoria']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
