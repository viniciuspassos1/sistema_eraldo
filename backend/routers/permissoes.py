from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_admin, usuario_tem_permissao, PAGINAS_PERMISSAO, PAGINAS_LABELS
from database import get_connection, fetch_all

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_admin)])


class PermissaoPagina(BaseModel):
    pagina: str
    permitido: bool


class PaginaPermissao(BaseModel):
    chave: str
    label: str


# Precisa vir antes de "/api/permissoes/{usuario_id}" — senão "paginas" seria
# interpretado como um usuario_id (rota parametrizada casa primeiro).
@router.get("/api/permissoes/paginas", response_model=list[PaginaPermissao])
def listar_paginas_permissao():
    return [PaginaPermissao(chave=chave, label=PAGINAS_LABELS.get(chave, chave)) for chave in PAGINAS_PERMISSAO]


@router.get("/api/permissoes", response_model=dict[str, dict[str, bool]])
def obter_todas_permissoes():
    usuarios = fetch_all("SELECT id, perfil FROM usuarios;")
    linhas = fetch_all("SELECT usuario_id, pagina, permitido FROM permissoes_acesso;")

    excecoes: dict[str, dict[str, bool]] = {}
    for r in linhas:
        excecoes.setdefault(str(r["usuario_id"]), {})[r["pagina"]] = r["permitido"]

    resultado: dict[str, dict[str, bool]] = {}
    for u in usuarios:
        uid = str(u["id"])
        if u["perfil"] == "ADMINISTRADOR":
            resultado[uid] = {pagina: True for pagina in PAGINAS_PERMISSAO}
        else:
            base = excecoes.get(uid, {})
            resultado[uid] = {pagina: base.get(pagina, True) for pagina in PAGINAS_PERMISSAO}
    return resultado


@router.get("/api/permissoes/{usuario_id}", response_model=list[PermissaoPagina])
def obter_permissoes(usuario_id: str):
    return [
        PermissaoPagina(pagina=pagina, permitido=usuario_tem_permissao(usuario_id, pagina))
        for pagina in PAGINAS_PERMISSAO
    ]


@router.put("/api/permissoes/{usuario_id}", response_model=list[PermissaoPagina])
def salvar_permissoes(usuario_id: str, body: list[PermissaoPagina]):
    validas = {p.pagina: p.permitido for p in body if p.pagina in PAGINAS_PERMISSAO}

    with get_connection() as conn:
        with conn.cursor() as cur:
            for pagina, permitido in validas.items():
                cur.execute(
                    """
                    INSERT INTO permissoes_acesso (usuario_id, pagina, permitido)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (usuario_id, pagina) DO UPDATE SET permitido = EXCLUDED.permitido;
                    """,
                    (usuario_id, pagina, permitido),
                )
        conn.commit()

    return [
        PermissaoPagina(pagina=pagina, permitido=usuario_tem_permissao(usuario_id, pagina))
        for pagina in PAGINAS_PERMISSAO
    ]
