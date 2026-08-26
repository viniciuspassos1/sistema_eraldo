from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import require_api_key
from database import fetch_all, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])


class ItemProgresso(BaseModel):
    itemId: str
    item: str
    ordem: int
    concluido: bool


class AtualizarProgresso(BaseModel):
    email: str
    itemId: str
    concluido: bool


class ResumoFuncionario(BaseModel):
    funcionarioId: str
    nome: str
    cargo: str
    percentual: int


@router.get("/api/onboarding/progresso", response_model=list[ItemProgresso])
def obter_progresso(email: str):
    rows = fetch_all(
        """
        SELECT i.id AS item_id, i.item, i.ordem, COALESCE(p.concluido, false) AS concluido
        FROM onboarding_checklist_itens i
        LEFT JOIN usuarios u ON u.email = %s
        LEFT JOIN onboarding_progresso p ON p.item_id = i.id AND p.funcionario_id = u.id
        ORDER BY i.ordem;
        """,
        (email,),
    )
    return [
        ItemProgresso(itemId=str(r["item_id"]), item=r["item"], ordem=r["ordem"], concluido=r["concluido"])
        for r in rows
    ]


@router.patch("/api/onboarding/progresso", response_model=list[ItemProgresso])
def atualizar_progresso(body: AtualizarProgresso):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM usuarios WHERE email = %s;", (body.email,))
            usuario = cur.fetchone()
            if not usuario:
                raise HTTPException(status_code=400, detail="Funcionário não encontrado.")

            cur.execute(
                """
                INSERT INTO onboarding_progresso (funcionario_id, item_id, concluido, concluido_em)
                VALUES (%s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
                ON CONFLICT (funcionario_id, item_id) DO UPDATE SET
                    concluido = EXCLUDED.concluido,
                    concluido_em = EXCLUDED.concluido_em;
                """,
                (usuario["id"], body.itemId, body.concluido, body.concluido),
            )
        conn.commit()

    return obter_progresso(body.email)


@router.get("/api/onboarding/resumo", response_model=list[ResumoFuncionario])
def resumo_onboarding():
    rows = fetch_all(
        """
        SELECT u.id AS funcionario_id, u.nome, u.cargo,
               COUNT(p.item_id) FILTER (WHERE p.concluido) AS concluidos,
               (SELECT COUNT(*) FROM onboarding_checklist_itens) AS total
        FROM usuarios u
        LEFT JOIN onboarding_progresso p ON p.funcionario_id = u.id
        GROUP BY u.id, u.nome, u.cargo
        HAVING COUNT(p.item_id) FILTER (WHERE p.concluido) > 0
        ORDER BY u.nome;
        """
    )
    return [
        ResumoFuncionario(
            funcionarioId=str(r["funcionario_id"]),
            nome=r["nome"],
            cargo=r["cargo"],
            percentual=round(100 * r["concluidos"] / r["total"]) if r["total"] else 0,
        )
        for r in rows
    ]
