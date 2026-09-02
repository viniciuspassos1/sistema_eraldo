# -*- coding: utf-8 -*-
"""
Popula/atualiza a tabela manual_interno_capitulos no Supabase com o
conteúdo real do escritório (substitui os capítulos de exemplo iniciais).

Uso:
    python -m db.seed_manual_interno

Idempotente: upsert por ordem (coluna unique no schema). Capítulos com
ordem > len(CAPITULOS) de uma versão anterior ficam órfãos no banco caso
o manual encolha — não é o caso aqui (mesma quantidade de capítulos).
"""

from database import get_connection, standalone_pool

CAPITULOS = [
    "Apresentação do Escritório",
    "Áreas de Atuação",
    "Público-Alvo",
    "Missão, Visão e Valores",
    "Setorização",
    "Horário de Funcionamento",
    "Horários de Atendimento",
    "Canais de Atendimento ao Cliente",
    "Relacionamento com o Cliente",
    "Sigilo Profissional",
    "Qualidade do Trabalho",
]

CONTEUDOS = {
    "Apresentação do Escritório": (
        "O escritório Eraldo Júnior Advocacia foi fundado na cidade de Salvador, no estado da Bahia, em 2016, "
        "com o propósito de oferecer serviços na área do direito laboral, com ênfase em Direito Previdenciário, "
        "Trabalhista e Empresarial. O sócio fundador, Eraldo Júnior, um advogado dedicado e comprometido com a "
        "causa laboral, visa proporcionar soluções legais, eficientes e justas para os trabalhadores e "
        "empregadores.\n\n"
        "O escritório rapidamente ganhou reconhecimento e confiança no mercado jurídico, devido à sua abordagem "
        "séria e ética com os clientes. Em 2017, com a crescente demanda por seus serviços, o escritório "
        "expandiu suas atividades e inaugurou uma filial na cidade de São Sebastião do Passé, na Bahia.\n\n"
        "A especialização do sócio fundador em direito previdenciário e sua dedicação em se manter atualizado "
        "sobre questões previdenciárias/trabalhistas complexas fizeram com que o escritório se destacasse "
        "nessas áreas, alcançando destaque a nível nacional em previdência.\n\n"
        "Em 2021, o escritório expandiu-se novamente com a abertura de uma nova filial no município de Catu, "
        "na Bahia. O crescimento constante e a expertise de Dr. Eraldo Júnior atraíram uma ampla base de "
        "clientes: mais de 1 mil clientes espalhados por todo o Brasil, com mais de 100 empresas das mais "
        "variadas atividades econômicas.\n\n"
        "Em 2023, o escritório inaugurou mais uma filial em Salinas das Margaridas/BA e foi agraciado com o "
        "prêmio Latin American Excellence in Law Awards. Em 2024, o escritório entrou no anuário da Análise de "
        "Advocacia como um dos escritórios mais admirados da região Nordeste do Brasil — o maior e mais "
        "relevante levantamento do mercado jurídico brasileiro."
    ),
    "Áreas de Atuação": (
        "O escritório Eraldo Junior Advocacia tem hoje atuação exclusiva em Direito Previdenciário, com "
        "assessoria e consultoria em questões relacionadas aos benefícios previdenciários, aposentadorias, "
        "auxílios, e revisão de benefícios. Prestamos assessoria a empresas em normas regulamentadoras, "
        "prevenção de acidentes de trabalho (FAP/SAT) e doenças ocupacionais."
    ),
    "Público-Alvo": (
        "Nosso escritório atende:\n"
        "- Empresas: de diversos setores, oferecendo consultoria e assessoria jurídica para assegurar o "
        "cumprimento das normas trabalhistas e previdenciárias.\n"
        "- Trabalhadores: que buscam garantir seus direitos trabalhistas e previdenciários."
    ),
    "Missão, Visão e Valores": (
        "Missão: restaurar a dignidade dos segurados da previdência social, por meio da concessão de um "
        "direito social que renove suas esperanças e as esperanças de sua família por uma condição de vida "
        "melhor e mais justa, de forma acessível e humana.\n\n"
        "Visão: nos tornarmos o maior e melhor escritório de advocacia previdenciária do Brasil, construindo "
        "uma história baseada em vidas e dignidades restauradas espalhadas por cada canto desse país, atuando "
        "de forma altamente técnica e responsável na proteção dos direitos sociais.\n\n"
        "Valores:\n"
        "- Ética: conduzimos todas as nossas atividades com integridade e respeito às normas legais.\n"
        "- Transparência: mantemos nossos clientes sempre informados sobre o andamento de seus processos.\n"
        "- Qualidade: buscamos constantemente a melhoria de nossos serviços.\n"
        "- Comprometimento: estamos dedicados a alcançar os melhores resultados para nossos clientes."
    ),
    "Setorização": (
        "Nosso escritório está organizado nos seguintes setores:\n"
        "- Recepção: primeiro contato e encaminhamento dos clientes.\n"
        "- Consultoria Jurídica: atendimento inicial e orientação jurídica.\n"
        "- Contencioso: gestão de processos judiciais.\n"
        "- Administração: gestão interna e suporte administrativo.\n"
        "- Marketing e Comunicação: divulgação e comunicação com o público."
    ),
    "Horário de Funcionamento": "Nosso escritório funciona de segunda a sexta-feira, das 09:00 às 18:00.",
    "Horários de Atendimento": (
        "- Atendimento de clientes de primeira vez: preferencialmente, às segundas e quintas, de 13h às 18h.\n"
        "- Atendimento a já clientes: preferencialmente, às quintas à tarde.\n"
        "- Peticionamento: às terças de 09h às 18h e às quintas pela manhã.\n"
        "- Diligências externas: preferencialmente às sextas de manhã.\n"
        "- Atendimento a associações e institutos: a cada 15 dias, preferencialmente às quartas de manhã.\n"
        "- Atendimento a cooperativas: a cada 15 dias, preferencialmente às sextas à tarde.\n"
        "- Organização interna do escritório: preferencialmente às sextas à tarde.\n"
        "- Resposta a e-mails: diariamente, reservando uma hora pela manhã e uma hora no final da tarde."
    ),
    "Canais de Atendimento ao Cliente": (
        "- Telefone do escritório: (71) 98108-8886\n"
        "- E-mail: eraldo@proferaldojunior.com.br\n"
        "- Website: www.proferaldojunior.com.br\n"
        "- Redes sociais: Facebook, Instagram, LinkedIn\n\n"
        "De forma alguma deverão ser utilizados celulares pessoais ou e-mails pessoais dos colaboradores para "
        "contato com os clientes."
    ),
    "Relacionamento com o Cliente": (
        "- Comunicação clara e transparente: informar o cliente sobre todas as etapas do processo.\n"
        "- Feedback regular: atualizações periódicas sobre o andamento dos casos.\n"
        "- Confiança e respeito: construção de um relacionamento baseado na confiança mútua."
    ),
    "Sigilo Profissional": (
        "Todas as informações fornecidas pelos clientes são tratadas com a máxima confidencialidade. "
        "Respeitamos o sigilo profissional e garantimos a segurança dos dados."
    ),
    "Qualidade do Trabalho": (
        "Comprometemo-nos a fornecer serviços jurídicos de alta qualidade, buscando constantemente aprimorar "
        "nossos conhecimentos e práticas para oferecer as melhores soluções aos nossos clientes."
    ),
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
