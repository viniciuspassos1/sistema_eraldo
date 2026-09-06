"""Cria a tabela logs_auditoria (seção 13 do schema.sql) no banco real.

Rodar uma vez: cd backend && ./venv/Scripts/python.exe -m db.migrate_logs_auditoria
Idempotente (IF NOT EXISTS) — seguro rodar de novo.
"""

from database import get_connection, standalone_pool

DDL = """
create table if not exists logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id) on delete set null,
  acao text not null,
  entidade text,
  entidade_id text,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_logs_auditoria_criado_em on logs_auditoria (criado_em desc);
create index if not exists idx_logs_auditoria_usuario on logs_auditoria (usuario_id, criado_em desc);

alter table logs_auditoria enable row level security;
"""


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
    print("OK: tabela logs_auditoria criada (ou já existia).")


if __name__ == "__main__":
    with standalone_pool():
        run()
