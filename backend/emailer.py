"""Envio de e-mail via API HTTP da Resend (https://resend.com) — usado pelo
lembrete de reunião (ver jobs.py) e pelo "esqueci minha senha" (ver
routers/auth.py). Não usa SMTP direto: o Render (e a maioria dos PaaS
gratuitos) bloqueia conexão SMTP de saída, então smtplib nunca funcionaria
lá mesmo com credencial certa (confirmado em produção: "OSError: [Errno 101]
Network is unreachable"). Chamadas HTTPS de saída, como esta, não têm esse
bloqueio.

Sem RESEND_API_KEY configurada, enviar_email() vira um no-op silencioso: o
resto do app (notificações internas) não depende disso."""

import logging

import httpx

from config import EMAIL_FROM, RESEND_API_KEY

logger = logging.getLogger("emailer")

_RESEND_URL = "https://api.resend.com/emails"


def email_configurado() -> bool:
    return bool(RESEND_API_KEY and EMAIL_FROM)


def enviar_email(destinatario: str, assunto: str, corpo: str) -> bool:
    if not email_configurado():
        logger.info("Resend não configurado — pulando e-mail para %s (%s)", destinatario, assunto)
        return False

    try:
        resp = httpx.post(
            _RESEND_URL,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": EMAIL_FROM, "to": [destinatario], "subject": assunto, "text": corpo},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Falha ao enviar e-mail para %s", destinatario)
        return False
