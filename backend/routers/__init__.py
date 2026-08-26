from . import funcionarios, ferias, feriados

all_routers = [
    funcionarios.router,
    ferias.router,
    feriados.router,
]
