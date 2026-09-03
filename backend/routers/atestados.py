import re

import psycopg2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from security import require_api_key, require_user, require_admin, UsuarioAtual
from database import fetch_all, fetch_one, get_connection

router = APIRouter(dependencies=[Depends(require_api_key)])

_STATUS_VALIDOS = {"APROVADO", "RECUSADO"}

# Content-Type é informado pelo próprio navegador do cliente — nunca confiar
# nele sem checar contra uma lista fechada. Sem isso, alguém poderia subir um
# .html/.svg com script embutido e ele seria servido de volta com o mesmo
# Content-Type declarado no upload.
_TIPOS_PERMITIDOS = {"application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


def _nome_seguro(nome: str) -> str:
    # Remove aspas e caracteres de controle (\r, \n) do nome do arquivo antes
    # de embutir no header Content-Disposition — evita quebrar/injetar o header.
    limpo = re.sub(r'[\r\n"]', "", nome)
    return limpo[:255] or "atestado"

_SELECT_PROPRIO = """
    SELECT id, data_inicio, data_fim, motivo, arquivo_nome, status, observacoes_rh
    FROM atestados
    WHERE funcionario_id = %s
    ORDER BY data_inicio DESC;
"""

_SELECT_TODOS = """
    SELECT a.id, a.data_inicio, a.data_fim, a.motivo, a.arquivo_nome, a.status,
           a.observacoes_rh, u.nome AS funcionario
    FROM atestados a
    JOIN usuarios u ON u.id = a.funcionario_id
    ORDER BY a.data_inicio DESC;
"""


class Atestado(BaseModel):
    id: str
    dataInicio: str
    dataFim: str
    motivo: str | None = None
    arquivoNome: str
    status: str
    observacoesRh: str | None = None


class AtestadoAdmin(Atestado):
    funcionario: str


class AtualizarStatus(BaseModel):
    status: str
    observacoesRh: str | None = None


def _serialize(row: dict) -> Atestado:
    return Atestado(
        id=str(row["id"]),
        dataInicio=row["data_inicio"].isoformat(),
        dataFim=row["data_fim"].isoformat(),
        motivo=row["motivo"],
        arquivoNome=row["arquivo_nome"],
        status=row["status"],
        observacoesRh=row["observacoes_rh"],
    )


@router.get("/api/atestados", response_model=list[Atestado])
def listar_meus_atestados(usuario: UsuarioAtual = Depends(require_user)):
    rows = fetch_all(_SELECT_PROPRIO, (usuario.id,))
    return [_serialize(r) for r in rows]


@router.get("/api/atestados/todos", response_model=list[AtestadoAdmin])
def listar_todos_atestados(_admin: UsuarioAtual = Depends(require_admin)):
    rows = fetch_all(_SELECT_TODOS)
    return [
        AtestadoAdmin(**_serialize(r).model_dump(), funcionario=r["funcionario"])
        for r in rows
    ]


@router.post("/api/atestados", response_model=Atestado, status_code=201)
async def criar_atestado(
    dataInicio: str = Form(...),
    dataFim: str = Form(...),
    motivo: str | None = Form(None),
    arquivo: UploadFile = File(...),
    usuario: UsuarioAtual = Depends(require_user),
):
    if arquivo.content_type not in _TIPOS_PERMITIDOS:
        raise HTTPException(status_code=400, detail="Envie um PDF ou uma foto (JPG, PNG, WEBP, HEIC).")

    conteudo = await arquivo.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(conteudo) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo maior que 8 MB.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO atestados
                    (funcionario_id, data_inicio, data_fim, motivo, arquivo_nome, arquivo_tipo, arquivo_dados)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, data_inicio, data_fim, motivo, arquivo_nome, status, observacoes_rh;
                """,
                (
                    usuario.id,
                    dataInicio,
                    dataFim,
                    motivo,
                    _nome_seguro(arquivo.filename or "atestado"),
                    arquivo.content_type,
                    conteudo,
                ),
            )
            row = cur.fetchone()
        conn.commit()

    return _serialize(row)


@router.get("/api/atestados/{atestado_id}/arquivo")
def baixar_arquivo(atestado_id: str, usuario: UsuarioAtual = Depends(require_user)):
    try:
        row = fetch_one(
            "SELECT funcionario_id, arquivo_nome, arquivo_tipo, arquivo_dados FROM atestados WHERE id = %s;",
            (atestado_id,),
        )
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Atestado não encontrado.")

    if not row:
        raise HTTPException(status_code=404, detail="Atestado não encontrado.")
    if str(row["funcionario_id"]) != usuario.id and usuario.perfil != "ADMINISTRADOR":
        raise HTTPException(status_code=403, detail="Sem permissão para acessar este arquivo.")

    # "attachment" (não "inline"): mesmo com o Content-Type validado no
    # upload, forçar download em vez de exibir no navegador fecha qualquer
    # brecha de conteúdo renderizado dentro da origem da aplicação.
    return Response(
        content=bytes(row["arquivo_dados"]),
        media_type=row["arquivo_tipo"],
        headers={"Content-Disposition": f'attachment; filename="{_nome_seguro(row["arquivo_nome"])}"'},
    )


@router.patch("/api/atestados/{atestado_id}/status", response_model=AtestadoAdmin)
def atualizar_status(atestado_id: str, body: AtualizarStatus, _admin: UsuarioAtual = Depends(require_admin)):
    if body.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido.")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE atestados SET status = %s, observacoes_rh = %s, updated_at = now()
                    WHERE id = %s;
                    """,
                    (body.status, body.observacoesRh, atestado_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Atestado não encontrado.")
            conn.commit()

            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT a.id, a.data_inicio, a.data_fim, a.motivo, a.arquivo_nome, a.status,
                           a.observacoes_rh, u.nome AS funcionario
                    FROM atestados a
                    JOIN usuarios u ON u.id = a.funcionario_id
                    WHERE a.id = %s;
                    """,
                    (atestado_id,),
                )
                row = cur.fetchone()
    except psycopg2.errors.InvalidTextRepresentation:
        raise HTTPException(status_code=404, detail="Atestado não encontrado.")

    return AtestadoAdmin(**_serialize(row).model_dump(), funcionario=row["funcionario"])
