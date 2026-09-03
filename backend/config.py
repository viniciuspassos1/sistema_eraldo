import os

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

_DEFAULT_ORIGINS = "http://localhost:8091,http://127.0.0.1:8091,http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if origin.strip()]

DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_EXPIRES_HOURS_SESSAO = int(os.getenv("JWT_EXPIRES_HOURS_SESSAO", "12"))
JWT_EXPIRES_HOURS_PERSISTENTE = int(os.getenv("JWT_EXPIRES_HOURS_PERSISTENTE", "720"))

# Jobs de fundo (lembrete de reunião por e-mail, onboarding parado, SLA de
# solicitações) — desligados por padrão. Em dev/teste isso evita que a suíte
# de testes (que sobe o app real via TestClient) dispare notificações/e-mails
# de verdade para funcionários reais. Ativar só em produção.
ENABLE_BACKGROUND_JOBS = os.getenv("ENABLE_BACKGROUND_JOBS", "false").strip().lower() == "true"

# SMTP para o lembrete de reunião por e-mail (complementar ao alerta sonoro,
# que só funciona com a aba aberta). Sem SMTP_HOST configurado, esse envio
# fica silenciosamente desativado — os alertas de onboarding/SLA continuam
# funcionando normalmente (são notificações internas, não e-mail).
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()
