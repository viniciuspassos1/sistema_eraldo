"""
Migra as notificações que hoje vivem em intranet-app/src/mocks/agenda.ts
(export `notifications`) para a tabela notificacoes no Supabase.

Uso:
    python -m db.seed_notificacoes

Sem destinatário específico ainda (destinatario_id fica nulo — notificação
geral), já que não há sessão real pra saber pra quem cada uma seria.
Idempotente: upsert por (mensagem, data).
"""

from database import get_connection, standalone_pool

NOTIFICACOES = [
    ("Você possui uma audiência amanhã às 14h.", "2026-08-10", False, "AUDIENCIA"),
    ("Suas férias começam em 7 dias.", "2026-08-09", False, "FERIAS"),
    ("Novo comunicado publicado.", "2026-08-10", False, "AVISO"),
    ("Hoje é aniversário de Fernanda Oliveira!", "2026-08-11", False, "ANIVERSARIO"),
    ("Novo documento disponível: Manual de Atendimento.", "2026-08-04", True, "DOCUMENTO"),
]


def run() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            for mensagem, data_notif, lida, tipo in NOTIFICACOES:
                cur.execute(
                    """
                    INSERT INTO notificacoes (mensagem, data, lida, tipo)
                    SELECT %s, %s, %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM notificacoes WHERE mensagem = %s AND data::date = %s::date
                    );
                    """,
                    (mensagem, data_notif, lida, tipo, mensagem, data_notif),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT mensagem, tipo, lida FROM notificacoes ORDER BY data DESC;")
            rows = cur.fetchall()
        print(f"{len(rows)} notificação(ões) na tabela notificacoes:")
        for row in rows:
            print(f" - [{row['tipo']}] {row['mensagem']} ({'lida' if row['lida'] else 'não lida'})")


if __name__ == "__main__":
    with standalone_pool():
        run()
