"""Cliente de IA generativa (Google Gemini) — usado só em dois recursos que
precisam de texto gerado de verdade: aba "Comunicação" do Assistente IA e
"ajudar a redigir" da Cooperativa de Ideias. A busca da aba "Processos
Gerais" do Assistente IA continua sem LLM, de propósito: a resposta
continua sendo sempre o texto literal do documento, pra nunca inventar
informação sobre processos internos (ver assistant/rag.py)."""

import logging

from fastapi import HTTPException
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger("llm")

_MAX_CARACTERES_ENTRADA = 4000

_client: genai.Client | None = None


def gemini_configurado() -> bool:
    return bool(GEMINI_API_KEY)


def _obter_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def gerar_texto(prompt: str, instrucao_sistema: str) -> str:
    if not gemini_configurado():
        raise HTTPException(
            status_code=503,
            detail="IA generativa não configurada no servidor. Peça para um administrador definir GEMINI_API_KEY no backend/.env.",
        )

    prompt = prompt.strip()[:_MAX_CARACTERES_ENTRADA]
    if not prompt:
        raise HTTPException(status_code=400, detail="Escreva alguma coisa antes de pedir ajuda à IA.")

    try:
        resposta = _obter_client().models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=instrucao_sistema),
        )
        texto = (resposta.text or "").strip()
    except Exception:
        logger.exception("Falha ao chamar a API do Gemini")
        raise HTTPException(
            status_code=502,
            detail="A IA generativa não respondeu agora (limite gratuito atingido ou instabilidade do provedor). Tente novamente em instantes.",
        )

    if not texto:
        raise HTTPException(status_code=502, detail="A IA não conseguiu gerar uma resposta para isso. Tente reformular.")
    return texto
