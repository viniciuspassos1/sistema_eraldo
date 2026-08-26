"""
Migra os compromissos que hoje vivem em intranet-app/src/mocks/agenda.ts
(export `agendaEvents`) para a tabela agenda_eventos no Supabase.

Uso:
    python -m db.seed_agenda_eventos

As datas do mock original (agosto de 2026) ficam velhas rápido — a grade da
Agenda só mostra a semana atual, então este script recalcula as datas em
cima da segunda-feira da semana corrente, pra sempre aparecer algo na tela
por padrão. Rodar de novo troca as datas pra semana em que for rodado.

Idempotente por (titulo, data): não duplica se rodar mais de uma vez no
mesmo dia.
"""

from datetime import date, timedelta

from database import get_connection, standalone_pool

# Mapeia o responsável pelo e-mail (chave estável em usuarios).
FUNCIONARIO_EMAIL = {
    "Eraldo Júnior": "eraldo.junior@proferaldojunior.com.br",
    "Ana Beatriz Souza": "ana.souza@proferaldojunior.com.br",
    "Mariana Costa": "mariana.costa@proferaldojunior.com.br",
    "Fernanda Oliveira": "fernanda.oliveira@proferaldojunior.com.br",
}

# offset_dias: 0 = segunda-feira da semana atual
EVENTOS = [
    ("Audiência • Dr. João", "AUDIENCIA", 0, "09:00", "Eraldo Júnior", "TJBA - 3ª Vara"),
    ("Reunião comercial", "REUNIAO", 0, "11:30", "Ana Beatriz Souza", "Escritório"),
    ("Audiência • Dra. Maria", "AUDIENCIA", 0, "14:00", "Mariana Costa", "Videoconferência"),
    ("Reunião de equipe", "REUNIAO", 1, "09:30", "Fernanda Oliveira", "Sala de reuniões"),
]


def run() -> None:
    segunda = date.today() - timedelta(days=date.today().weekday())

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM usuarios;")
            id_por_email = {row["email"]: row["id"] for row in cur.fetchall()}

            for titulo, tipo, offset_dias, horario, responsavel_nome, local in EVENTOS:
                email = FUNCIONARIO_EMAIL[responsavel_nome]
                responsavel_id = id_por_email.get(email)
                if not responsavel_id:
                    print(f"AVISO: usuário {email} não encontrado, pulando.")
                    continue
                data_evento = segunda + timedelta(days=offset_dias)
                cur.execute(
                    """
                    INSERT INTO agenda_eventos (titulo, tipo, data, horario, responsavel_id, local)
                    SELECT %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM agenda_eventos WHERE titulo = %s AND data = %s
                    );
                    """,
                    (titulo, tipo, data_evento, horario, responsavel_id, local, titulo, data_evento),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.titulo, e.data, e.horario, u.nome AS responsavel
                FROM agenda_eventos e LEFT JOIN usuarios u ON u.id = e.responsavel_id
                ORDER BY e.data, e.horario;
                """
            )
            rows = cur.fetchall()
        print(f"{len(rows)} evento(s) na tabela agenda_eventos:")
        for row in rows:
            print(f" - {row['titulo']}: {row['data']} {row['horario']} ({row['responsavel']})")


if __name__ == "__main__":
    with standalone_pool():
        run()
