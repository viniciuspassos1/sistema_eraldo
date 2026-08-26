"""
Migra os funcionários que hoje vivem em intranet-app/src/mocks/employees.ts
para a tabela usuarios no Supabase.

Uso:
    python -m db.seed_usuarios

Idempotente: roda um upsert por e-mail, então pode ser executado de novo
sem duplicar linhas.

Login continua mockado no frontend (AuthContext usa mocks/employees.ts) —
por isso senha_hash aqui é só um placeholder, não uma senha usável.
"""

from database import get_connection

SENHA_PLACEHOLDER = "sem-autenticacao-real-ainda"

FUNCIONARIOS = [
    ("Eraldo Júnior", "eraldo.junior@proferaldojunior.com.br", "Sócio Fundador", "Jurídico", "ADMINISTRADOR", "2014-03-01", "1985-09-14", "(71) 99999-0001", "ATIVO"),
    ("Mariana Costa", "mariana.costa@proferaldojunior.com.br", "Advogada Sênior", "Jurídico", "GESTOR", "2017-06-10", "1990-08-14", "(71) 99999-0002", "ATIVO"),
    ("João Pedro Lima", "joao.lima@proferaldojunior.com.br", "Advogado", "Previdenciário", "FUNCIONARIO", "2020-02-15", "1993-08-20", "(71) 99999-0003", "ATIVO"),
    ("Ana Beatriz Souza", "ana.souza@proferaldojunior.com.br", "Assistente Jurídica", "Jurídico", "FUNCIONARIO", "2021-09-01", "1997-09-05", "(71) 99999-0004", "FERIAS"),
    ("Carlos Eduardo Santos", "carlos.santos@proferaldojunior.com.br", "Analista Financeiro", "Financeiro", "FUNCIONARIO", "2019-11-20", "1988-12-02", "(71) 99999-0005", "ATIVO"),
    ("Fernanda Oliveira", "fernanda.oliveira@proferaldojunior.com.br", "Analista de RH", "Recursos Humanos", "GESTOR", "2018-04-18", "1991-08-11", "(71) 99999-0006", "ATIVO"),
    ("Rafael Andrade", "rafael.andrade@proferaldojunior.com.br", "Estagiário Jurídico", "Previdenciário", "FUNCIONARIO", "2025-01-06", "2001-03-30", "(71) 99999-0007", "ATIVO"),
    ("Patrícia Gomes", "patricia.gomes@proferaldojunior.com.br", "Recepcionista", "Administrativo", "FUNCIONARIO", "2022-05-09", "1995-08-25", "(71) 99999-0008", "ATIVO"),
]


def run() -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for nome, email, cargo, setor, perfil, data_entrada, aniversario, telefone, status in FUNCIONARIOS:
                cur.execute(
                    """
                    INSERT INTO usuarios
                        (nome, email, senha_hash, cargo, setor, perfil, data_entrada, aniversario, telefone, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (email) DO UPDATE SET
                        nome = EXCLUDED.nome,
                        cargo = EXCLUDED.cargo,
                        setor = EXCLUDED.setor,
                        perfil = EXCLUDED.perfil,
                        data_entrada = EXCLUDED.data_entrada,
                        aniversario = EXCLUDED.aniversario,
                        telefone = EXCLUDED.telefone,
                        status = EXCLUDED.status,
                        updated_at = now();
                    """,
                    (nome, email, SENHA_PLACEHOLDER, cargo, setor, perfil, data_entrada, aniversario, telefone, status),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT id, nome, email FROM usuarios ORDER BY nome;")
            rows = cur.fetchall()

        print(f"{len(rows)} funcionário(s) na tabela usuarios:")
        for row in rows:
            print(f" - {row['nome']} ({row['email']}) -> {row['id']}")
    finally:
        conn.close()


if __name__ == "__main__":
    run()
