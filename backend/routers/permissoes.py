from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_admin, usuario_tem_permissao, PAGINAS_PERMISSAO
from database import get_connection

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_admin)])


class PermissaoPagina(BaseModel):
    pagina: str
    permitido: bool


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
