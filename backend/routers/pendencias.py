"""Agrega, num único lugar, o que hoje fica espalhado em ilhas separadas
(onboarding, solicitações, atestados, cooperativa de ideias) — cada pessoa vê
só o que é dela pra resolver; administrador vê também o que precisa da
aprovação/atenção dele. Usado pelo widget "Minhas pendências" do Dashboard."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual
from database import fetch_one

router = APIRouter(dependencies=[Depends(require_api_key)])


class Pendencia(BaseModel):
    tipo: str
    mensagem: str
    link: str


def _plural(n: int, singular: str, plural: str) -> str:
    return singular if n == 1 else plural


@router.get("/api/pendencias", response_model=list[Pendencia])
def minhas_pendencias(usuario: UsuarioAtual = Depends(require_user)):
    pendencias: list[Pendencia] = []

    # Antes eram até 7 idas sequenciais ao banco (uma por tipo de pendência);
    # como cada uma é só um COUNT(*), uma única ida com subqueries escalares
    # dá o mesmo resultado com 1 round-trip de rede em vez de 7. As contagens
    # só-de-admin são calculadas sempre (custo local é irrelevante), mas só
    # entram na resposta se o usuário for ADMINISTRADOR — mesma regra de
    # antes, só que decidida em Python em vez de nem rodar a query.
    contagens = fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FILTER (WHERE NOT COALESCE(p.concluido, false))
             FROM onboarding_checklist_itens i
             LEFT JOIN onboarding_progresso p ON p.item_id = i.id AND p.funcionario_id = %s) AS onboarding,
            (SELECT COUNT(*) FROM notas_pessoais WHERE usuario_id = %s AND concluida = false) AS anotacoes,
            (SELECT COUNT(*) FROM solicitacoes
             WHERE solicitante_id = %s AND status IN ('ABERTO', 'EM_ANALISE', 'EM_ANDAMENTO')) AS minhas_solicitacoes,
            (SELECT COUNT(*) FROM atestados WHERE funcionario_id = %s AND status = 'PENDENTE') AS meus_atestados,
            (SELECT COUNT(*) FROM atestados WHERE status = 'PENDENTE') AS atestados_aprovar,
            (SELECT COUNT(*) FROM cooperativa_ideias WHERE status IN ('NOVA', 'EM_ANALISE')) AS ideias_triagem,
            (SELECT COUNT(*) FROM solicitacoes
             WHERE responsavel_id IS NULL AND status IN ('ABERTO', 'EM_ANALISE')) AS sem_responsavel;
        """,
        (usuario.id, usuario.id, usuario.id, usuario.id),
    )

    is_admin = usuario.perfil == "ADMINISTRADOR"

    if is_admin and contagens["onboarding"] > 0:
        n = contagens["onboarding"]
        pendencias.append(
            Pendencia(
                tipo="ONBOARDING",
                mensagem=f"Você tem {n} {_plural(n, 'item pendente', 'itens pendentes')} no seu onboarding.",
                link="/calendario?tab=onboarding",
            )
        )

    if contagens["anotacoes"] > 0:
        n = contagens["anotacoes"]
        pendencias.append(
            Pendencia(
                tipo="ANOTACAO",
                mensagem=f"Você tem {n} {_plural(n, 'anotação pendente', 'anotações pendentes')}.",
                link="/calendario?tab=anotacoes",
            )
        )

    if contagens["minhas_solicitacoes"] > 0:
        n = contagens["minhas_solicitacoes"]
        pendencias.append(
            Pendencia(
                tipo="SOLICITACAO",
                mensagem=f"Você tem {n} {_plural(n, 'solicitação em andamento', 'solicitações em andamento')}.",
                link="/solicitacoes",
            )
        )

    if contagens["meus_atestados"] > 0:
        n = contagens["meus_atestados"]
        pendencias.append(
            Pendencia(
                tipo="ATESTADO",
                mensagem=f"Você tem {n} {_plural(n, 'atestado', 'atestados')} aguardando aprovação do RH.",
                link="/calendario?tab=atestado",
            )
        )

    if is_admin:
        if contagens["atestados_aprovar"] > 0:
            n = contagens["atestados_aprovar"]
            pendencias.append(
                Pendencia(
                    tipo="ATESTADO",
                    mensagem=f"{n} {_plural(n, 'atestado', 'atestados')} de funcionários aguardando sua aprovação.",
                    link="/calendario?tab=atestado",
                )
            )

        if contagens["ideias_triagem"] > 0:
            n = contagens["ideias_triagem"]
            pendencias.append(
                Pendencia(
                    tipo="IDEIA",
                    mensagem=f"{n} {_plural(n, 'ideia', 'ideias')} da Cooperativa aguardando triagem.",
                    link="/cooperativa-ideias",
                )
            )

        if contagens["sem_responsavel"] > 0:
            n = contagens["sem_responsavel"]
            pendencias.append(
                Pendencia(
                    tipo="SOLICITACAO",
                    mensagem=f"{n} {_plural(n, 'solicitação sem responsável definido', 'solicitações sem responsável definido')}.",
                    link="/solicitacoes",
                )
            )

    return pendencias
