from . import funcionarios, ferias, feriados, agenda

all_routers = [
    funcionarios.router,
    ferias.router,
    feriados.router,
    agenda.router,
]
