"""
Define ou reseta a senha de um usuário: gera o hash bcrypt e grava no banco.
Não é um script de uso único — é o utilitário que existe até haver um
autoatendimento de troca/recuperação de senha na própria aplicação.

Uso:
    python -m db.set_senha email@dominio.com "nova-senha"
"""

import sys

from database import get_connection, standalone_pool
from security import hash_senha


def run(email: str, senha: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE usuarios SET senha_hash = %s, updated_at = now() WHERE email = %s RETURNING id;",
                (hash_senha(senha), email),
            )
            row = cur.fetchone()
        conn.commit()

    if not row:
        print(f"Nenhum usuário encontrado com o e-mail {email}.")
        sys.exit(1)
    print(f"Senha atualizada para {email}.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python -m db.set_senha <email> <nova-senha>")
        sys.exit(1)

    with standalone_pool():
        run(sys.argv[1], sys.argv[2])
