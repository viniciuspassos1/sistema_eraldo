"""
Migra o checklist de onboarding que hoje vive hardcoded em
intranet-app/src/pages/Onboarding.tsx para as tabelas
onboarding_checklist_itens e onboarding_progresso no Supabase.

Uso:
    python -m db.seed_onboarding

Progresso de exemplo: Eraldo Júnior (conta de teste do login mockado)
com os 2 primeiros itens concluídos, e Rafael Andrade (novo estagiário)
com os 3 primeiros — mesma situação que já existia no mock.

Idempotente: upsert por ordem (itens) e por (funcionario_id, item_id) (progresso).
"""

from database import get_connection, standalone_pool

ITENS = [
    "Criar conta",
    "Ler manual interno",
    "Conhecer sistemas",
    "Conhecer equipe",
    "Treinamento",
    "Segurança da informação",
    "Procedimentos internos",
]

PROGRESSO_INICIAL = {
    "eraldo.junior@proferaldojunior.com.br": 2,
    "rafael.andrade@proferaldojunior.com.br": 3,
}


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            item_ids = []
            for i, item in enumerate(ITENS, start=1):
                cur.execute(
                    """
                    INSERT INTO onboarding_checklist_itens (item, ordem)
                    VALUES (%s, %s)
                    ON CONFLICT (ordem) DO UPDATE SET item = EXCLUDED.item
                    RETURNING id;
                    """,
                    (item, i),
                )
                item_ids.append(cur.fetchone()["id"])

            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for email, quantidade_concluida in PROGRESSO_INICIAL.items():
                funcionario_id = id_por_email.get(email)
                if not funcionario_id:
                    print(f"AVISO: usuário {email} não encontrado, pulando.")
                    continue
                for i, item_id in enumerate(item_ids):
                    concluido = i < quantidade_concluida
                    cur.execute(
                        """
                        INSERT INTO onboarding_progresso (funcionario_id, item_id, concluido, concluido_em)
                        VALUES (%s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
                        ON CONFLICT (funcionario_id, item_id) DO UPDATE SET
                            concluido = EXCLUDED.concluido,
                            concluido_em = EXCLUDED.concluido_em;
                        """,
                        (funcionario_id, item_id, concluido, concluido),
                    )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT item, ordem FROM onboarding_checklist_itens ORDER BY ordem;")
            itens_rows = cur.fetchall()
        print(f"{len(itens_rows)} item(ns) no checklist:")
        for row in itens_rows:
            print(f" - {row['ordem']}. {row['item']}")


if __name__ == "__main__":
    with standalone_pool():
        run()
