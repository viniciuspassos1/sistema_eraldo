# Backend — Meu Authenticator

API mínima em Python (FastAPI) que gera códigos TOTP a partir de segredos
guardados só no servidor. Ver arquitetura completa em
`intranet-app/docs/meu-authenticator-arquitetura.md`.

## Rodando localmente

```bash
cd backend
python3 -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt  # Mac/Linux

cp .env.example .env
```

Edite o `.env`:

- `API_KEY`: qualquer valor forte (ex: `openssl rand -hex 32`).
- `AUTH_SERVICE_1_NAME` / `AUTH_SERVICE_1_SECRET`: nome do serviço e a chave
  secreta em texto que aparece no momento em que você ativa um 2FA **novo**
  em algum lugar (não funciona com um Authenticator já configurado antes —
  o segredo só existe nesse momento inicial).

Suba o servidor:

```bash
./venv/Scripts/python.exe -m uvicorn main:app --port 8010
```

No `intranet-app/.env`, aponte para essa porta e use a mesma `API_KEY`:

```
VITE_AUTHENTICATOR_API_URL=http://localhost:8010
VITE_AUTHENTICATOR_API_KEY=<mesma chave do backend/.env>
```

Rode `npm run build` (ou `npm run dev`) no `intranet-app` e acesse a aba
**Meu Authenticator** na intranet.

## Importante

Isso é um MVP local, pessoal, pra validar o fluxo. Antes de usar com contas
reais do escritório em produção, ver a seção de segurança do documento de
arquitetura (auditoria, RBAC, cofre de segredos de verdade, HTTPS, etc.) —
hoje o `.env` em texto plano é aceitável só para teste local.
