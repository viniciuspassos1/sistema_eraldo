"""Envio de e-mail via SMTP — só usado pelo lembrete de reunião (ver jobs.py).
Sem SMTP_HOST configurado, enviar_email() vira um no-op silencioso: o resto
do app (notificações internas) não depende disso."""

import logging
import smtplib
from email.mime.text import MIMEText

from config import SMTP_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER

logger = logging.getLogger("emailer")


def smtp_configurado() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def enviar_email(destinatario: str, assunto: str, corpo: str) -> bool:
    if not smtp_configurado():
        logger.info("SMTP não configurado — pulando e-mail para %s (%s)", destinatario, assunto)
        return False

    msg = MIMEText(corpo)
    msg["Subject"] = assunto
    msg["From"] = SMTP_FROM
    msg["To"] = destinatario

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(SMTP_FROM, [destinatario], msg.as_string())
        return True
    except Exception:
        logger.exception("Falha ao enviar e-mail de lembrete para %s", destinatario)
        return False
