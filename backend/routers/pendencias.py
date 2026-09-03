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

    onboarding = fetch_one(
        """
        SELECT COUNT(*) FILTER (WHERE NOT COALESCE(p.concluido, false)) AS pendentes
        FROM onboarding_checklist_itens i
        LEFT JOIN onboarding_progresso p ON p.item_id = i.id AND p.funcionario_id = %s;
        """,
        (usuario.id,),
    )
    if onboarding and onboarding["pendentes"] > 0:
        n = onboarding["pendentes"]
        pendencias.append(
            Pendencia(
                tipo="ONBOARDING",
                mensagem=f"Você tem {n} {_plural(n, 'item pendente', 'itens pendentes')} no seu onboarding.",
                link="/calendario?tab=onboarding",
            )
        )

    minhas_solicitacoes = fetch_one(
        """
        SELECT COUNT(*) AS n FROM solicitacoes
        WHERE solicitante_id = %s AND status IN ('ABERTO', 'EM_ANALISE', 'EM_ANDAMENTO');
        """,
        (usuario.id,),
    )
    if minhas_solicitacoes and minhas_solicitacoes["n"] > 0:
        n = minhas_solicitacoes["n"]
        pendencias.append(
            Pendencia(
                tipo="SOLICITACAO",
                mensagem=f"Você tem {n} {_plural(n, 'solicitação em andamento', 'solicitações em andamento')}.",
                link="/solicitacoes",
            )
        )

    meus_atestados = fetch_one(
        "SELECT COUNT(*) AS n FROM atestados WHERE funcionario_id = %s AND status = 'PENDENTE';",
        (usuario.id,),
    )
    if meus_atestados and meus_atestados["n"] > 0:
        n = meus_atestados["n"]
        pendencias.append(
            Pendencia(
                tipo="ATESTADO",
                mensagem=f"Você tem {n} {_plural(n, 'atestado', 'atestados')} aguardando aprovação do RH.",
                link="/calendario?tab=atestado",
            )
        )

    if usuario.perfil == "ADMINISTRADOR":
        atestados_aprovar = fetch_one("SELECT COUNT(*) AS n FROM atestados WHERE status = 'PENDENTE';")
        if atestados_aprovar and atestados_aprovar["n"] > 0:
            n = atestados_aprovar["n"]
            pendencias.append(
                Pendencia(
                    tipo="ATESTADO",
                    mensagem=f"{n} {_plural(n, 'atestado', 'atestados')} de funcionários aguardando sua aprovação.",
                    link="/calendario?tab=atestado",
                )
            )

        ideias_triagem = fetch_one(
            "SELECT COUNT(*) AS n FROM cooperativa_ideias WHERE status IN ('NOVA', 'EM_ANALISE');"
        )
        if ideias_triagem and ideias_triagem["n"] > 0:
            n = ideias_triagem["n"]
            pendencias.append(
                Pendencia(
                    tipo="IDEIA",
                    mensagem=f"{n} {_plural(n, 'ideia', 'ideias')} da Cooperativa aguardando triagem.",
                    link="/cooperativa-ideias",
                )
            )

        sem_responsavel = fetch_one(
            "SELECT COUNT(*) AS n FROM solicitacoes WHERE responsavel_id IS NULL AND status IN ('ABERTO', 'EM_ANALISE');"
        )
        if sem_responsavel and sem_responsavel["n"] > 0:
            n = sem_responsavel["n"]
            pendencias.append(
                Pendencia(
                    tipo="SOLICITACAO",
                    mensagem=f"{n} {_plural(n, 'solicitação sem responsável definido', 'solicitações sem responsável definido')}.",
                    link="/solicitacoes",
                )
            )

    return pendencias
