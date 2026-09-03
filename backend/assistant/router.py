from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, require_pagina, UsuarioAtual
from llm import gerar_texto

from .rag import answer_question

router = APIRouter(dependencies=[Depends(require_api_key), Depends(require_pagina("assistente-ia"))])

_INSTRUCAO_COMUNICACAO = (
    "Você ajuda funcionários de um escritório de advocacia brasileiro a escrever "
    "comunicações internas e externas — avisos, e-mails, respostas a clientes. "
    "Responda em português do Brasil, tom profissional e cordial, direto ao ponto. "
    "Devolva só o texto pronto para uso (ou a orientação pedida), sem introduções "
    "nem explicações sobre o que você fez."
)


class AskRequest(BaseModel):
    pergunta: str


class Fonte(BaseModel):
    documento: str
    secao: str = ""


class AskResponse(BaseModel):
    resposta: str
    fontes: list[Fonte]
    encontrado: bool


@router.post("/api/assistant/ask", response_model=AskResponse)
def ask(body: AskRequest, usuario: UsuarioAtual = Depends(require_user)) -> AskResponse:
    pergunta = body.pergunta.strip()
    if not pergunta:
        return AskResponse(resposta="", fontes=[], encontrado=False)

    result = answer_question(pergunta, setor_usuario=usuario.setor, is_admin=usuario.perfil == "ADMINISTRADOR")
    return AskResponse(**result)


class ComunicacaoRequest(BaseModel):
    pergunta: str


class ComunicacaoResponse(BaseModel):
    resposta: str


@router.post("/api/assistant/comunicacao", response_model=ComunicacaoResponse)
def comunicacao(body: ComunicacaoRequest, _usuario: UsuarioAtual = Depends(require_user)) -> ComunicacaoResponse:
    resposta = gerar_texto(body.pergunta, _INSTRUCAO_COMUNICACAO)
    return ComunicacaoResponse(resposta=resposta)
