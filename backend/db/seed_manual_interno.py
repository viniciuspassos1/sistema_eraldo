"""
Migra os capítulos que hoje vivem hardcoded em
intranet-app/src/pages/ManualInterno.tsx para a tabela
manual_interno_capitulos no Supabase.

Uso:
    python -m db.seed_manual_interno

Idempotente: upsert por ordem (coluna unique no schema).
"""

from database import get_connection, standalone_pool

CAPITULOS = [
    "Apresentação",
    "Cultura",
    "Horários",
    "Conduta",
    "Atendimento",
    "Sistemas",
    "Segurança",
    "Procedimentos",
    "Comunicação",
    "Outros",
]

CONTEUDOS = {
    "Apresentação": "O escritório Eraldo Júnior Advocacia atua há mais de 10 anos em direito previdenciário, com compromisso de dignidade, confiança e respeito aos clientes.",
    "Cultura": "Valorizamos ética, colaboração e excelência técnica. Cada colaborador é incentivado a propor melhorias nos processos internos.",
    "Horários": "Expediente de segunda a sexta, das 08h às 18h, com 1h de intervalo para almoço. Horários flexíveis mediante alinhamento com a gestão.",
    "Conduta": "Espera-se postura profissional, sigilo sobre informações de clientes e respeito mútuo entre colegas de trabalho.",
    "Atendimento": "O primeiro contato com o cliente deve ser respondido em até 24h úteis. Dúvidas processuais são direcionadas ao advogado responsável.",
    "Sistemas": "Utilizamos PJe, e-SAJ e Meu INSS. Credenciais de acesso são pessoais e intransferíveis.",
    "Segurança": "Não compartilhe senhas. Documentos sensíveis devem ser armazenados apenas nos repositórios autorizados pelo escritório.",
    "Procedimentos": "Consulte a Base de Conhecimento para os procedimentos detalhados de cada área (jurídico, financeiro, administrativo).",
    "Comunicação": "Avisos oficiais são publicados na aba Avisos. Solicitações internas devem ser abertas na Central de Solicitações.",
    "Outros": "Dúvidas não cobertas neste manual podem ser encaminhadas ao setor de Recursos Humanos ou consultadas com o Assistente IA.",
}


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            for i, titulo in enumerate(CAPITULOS, start=1):
                cur.execute(
                    """
                    INSERT INTO manual_interno_capitulos (titulo, conteudo, ordem)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (ordem) DO UPDATE SET
                        titulo = EXCLUDED.titulo,
                        conteudo = EXCLUDED.conteudo;
                    """,
                    (titulo, CONTEUDOS[titulo], i),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT titulo, ordem FROM manual_interno_capitulos ORDER BY ordem;")
            rows = cur.fetchall()
        print(f"{len(rows)} capítulo(s) na tabela manual_interno_capitulos:")
        for row in rows:
            print(f" - {row['ordem']}. {row['titulo']}")


if __name__ == "__main__":
    with standalone_pool():
        run()
