from fastapi import APIRouter, Depends
from pydantic import BaseModel

from security import require_api_key, require_user, UsuarioAtual

from .rag import answer_question

router = APIRouter(dependencies=[Depends(require_api_key)])


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
