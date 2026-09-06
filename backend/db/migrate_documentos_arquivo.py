"""Adiciona as colunas de arquivo real em `documentos`.

O schema original previa `arquivo_url` (Supabase Storage), mas não há
credencial de storage configurada no projeto. Em vez de inventar uma
integração que não dá pra verificar funcionando, replica o padrão já
comprovado em `atestados` (bytes guardados direto no Postgres via bytea).
`arquivo_url` continua existindo, sem uso, caso o projeto migre pra um
storage de verdade no futuro.

Rodar uma vez: cd backend && ./venv/Scripts/python.exe -m db.migrate_documentos_arquivo
Idempotente (IF NOT EXISTS) — seguro rodar de novo.
"""

from database import get_connection, standalone_pool

DDL = """
alter table documentos add column if not exists arquivo_tipo text;
alter table documentos add column if not exists arquivo_dados bytea;
"""


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
    print("OK: colunas arquivo_tipo/arquivo_dados adicionadas a documentos (ou já existiam).")


if __name__ == "__main__":
    with standalone_pool():
        run()
