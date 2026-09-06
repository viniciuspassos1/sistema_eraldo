"""Cliente de IA generativa (Google Gemini) — usado só em dois recursos que
precisam de texto gerado de verdade: aba "Comunicação" do Assistente IA e
"ajudar a redigir" da Cooperativa de Ideias. A busca da aba "Processos
Gerais" do Assistente IA continua sem LLM, de propósito: a resposta
continua sendo sempre o texto literal do documento, pra nunca inventar
informação sobre processos internos (ver assistant/rag.py)."""

import logging
import re

from fastapi import HTTPException
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger("llm")

_MAX_CARACTERES_ENTRADA = 4000

# Mascaramento básico de CPF antes de mandar o texto pra API externa do
# Google — o texto do usuário pode conter dado de cliente colado sem querer
# (ver auditoria de segurança). Não é detecção completa de PII, só a defesa
# mais barata contra o caso mais comum. Aceita com ou sem pontuação.
_CPF_REGEX = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")


def _mascarar_cpf(texto: str) -> str:
    return _CPF_REGEX.sub("[CPF removido]", texto)


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

    prompt = prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Escreva alguma coisa antes de pedir ajuda à IA.")
    prompt = _mascarar_cpf(prompt)[:_MAX_CARACTERES_ENTRADA]

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
