from . import funcionarios, ferias, feriados, agenda, avisos, solicitacoes

all_routers = [
    funcionarios.router,
    ferias.router,
    feriados.router,
    agenda.router,
    avisos.router,
    solicitacoes.router,
]
