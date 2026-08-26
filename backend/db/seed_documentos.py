"""
Migra os documentos que hoje vivem em intranet-app/src/mocks/documents.ts
para a tabela documentos no Supabase.

Uso:
    python -m db.seed_documentos

Idempotente: upsert por titulo. Não há arquivo real nem upload ainda —
tamanho_bytes é só o valor equivalente ao "82 KB" etc. do mock, e
arquivo_url fica nulo (sem Supabase Storage configurado ainda).
"""

from database import get_connection, standalone_pool

FUNCIONARIO_EMAIL = {
    "Mariana Costa": "mariana.costa@proferaldojunior.com.br",
    "Carlos Eduardo Santos": "carlos.santos@proferaldojunior.com.br",
    "Fernanda Oliveira": "fernanda.oliveira@proferaldojunior.com.br",
    "Eraldo Júnior": "eraldo.junior@proferaldojunior.com.br",
    "João Pedro Lima": "joao.lima@proferaldojunior.com.br",
    "Ana Beatriz Souza": "ana.souza@proferaldojunior.com.br",
}

# (titulo, categoria, autor, data, atualizado_em, tags, status, tamanho_kb)
DOCUMENTOS = [
    ("Modelo de Procuração Ad Judicia", "Jurídico", "Mariana Costa", "2026-02-10", "2026-06-01", ["modelo", "procuração"], "PUBLICADO", 82),
    ("Política de Reembolso de Despesas", "Financeiro", "Carlos Eduardo Santos", "2025-11-20", "2026-01-15", ["financeiro", "política"], "PUBLICADO", 140),
    ("Checklist de Onboarding", "Recursos Humanos", "Fernanda Oliveira", "2025-08-01", "2026-07-20", ["rh", "onboarding"], "PUBLICADO", 65),
    ("Manual de Atendimento ao Cliente", "Comercial", "Eraldo Júnior", "2025-05-12", "2026-08-04", ["atendimento", "manual"], "PUBLICADO", 310),
    ("Petição Padrão - Aposentadoria por Idade", "Jurídico", "João Pedro Lima", "2026-03-22", "2026-03-22", ["modelo", "previdenciário"], "PUBLICADO", 95),
    ("Política de Segurança da Informação", "Tecnologia", "Carlos Eduardo Santos", "2025-09-18", "2026-04-10", ["segurança", "ti"], "PUBLICADO", 220),
    ("Proposta Comercial - Modelo", "Marketing", "Ana Beatriz Souza", "2026-01-05", "2026-01-30", ["comercial", "modelo"], "RASCUNHO", 180),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for titulo, categoria, autor_nome, data_doc, atualizado_em, tags, status, tamanho_kb in DOCUMENTOS:
                autor_id = id_por_email.get(FUNCIONARIO_EMAIL[autor_nome])
                cur.execute(
                    """
                    INSERT INTO documentos (titulo, categoria, autor_id, data, atualizado_em, tags, status, tamanho_bytes)
                    SELECT %s, %s, %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (SELECT 1 FROM documentos WHERE titulo = %s);
                    """,
                    (titulo, categoria, autor_id, data_doc, atualizado_em, tags, status, tamanho_kb * 1024, titulo),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT titulo, categoria, status FROM documentos ORDER BY titulo;")
            rows = cur.fetchall()
        print(f"{len(rows)} documento(s) na tabela documentos:")
        for row in rows:
            print(f" - {row['titulo']} ({row['categoria']}, {row['status']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
