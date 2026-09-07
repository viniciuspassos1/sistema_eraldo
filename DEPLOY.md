# Deploy em produção (VPS)

Passo a passo pra colocar o sistema no ar numa VPS (ex.: Hostinger) usando
Docker. O `docker-compose.yml` na raiz já orquestra os dois serviços:
backend (FastAPI) e frontend servido por Caddy — que também faz proxy
reverso de `/api/*` pro backend e emite HTTPS sozinho via Let's Encrypt,
sem precisar configurar SSL na mão.

## Pré-requisitos

- Domínio com DNS (registro A) já apontando pro IP da VPS — o Caddy só
  consegue emitir o certificado depois que o domínio resolve pro servidor.
- Docker e Docker Compose instalados na VPS (`curl -fsSL
  https://get.docker.com | sh` funciona na maioria das distros Ubuntu/Debian).
- Portas 80 e 443 liberadas no firewall da VPS.
- Acesso ao banco Supabase já em produção (mesma `DATABASE_URL` usada em
  dev, ou um projeto Supabase separado pra produção — decisão do time).

## Passo a passo

1. **Clonar o repositório na VPS:**
   ```bash
   git clone <url-do-repositorio>
   cd sistema_eraldo
   ```

2. **Configurar `backend/.env`** a partir de `backend/.env.example`, com
   valores reais de produção:
   - `AMBIENTE=producao` (desliga `/docs`/`/redoc`/`/openapi.json`)
   - `API_KEY` e `JWT_SECRET`: gerar novos e únicos pra produção (nunca
     reaproveitar os de dev) — `python -c "import secrets; print(secrets.token_hex(32))"`
   - `DATABASE_URL`: string de conexão do Supabase de produção
   - `ALLOWED_ORIGINS`: `https://<seu-dominio>` (embora, com o Caddy
     fazendo proxy no mesmo domínio, a maioria das chamadas já sejam
     same-origin e não passem por CORS)
   - `ENABLE_BACKGROUND_JOBS=true` (lembretes de reunião, alertas de
     onboarding/SLA)
   - `SMTP_*`: credenciais reais do escritório, se for usar o lembrete de
     reunião por e-mail
   - `GEMINI_API_KEY`: chave real, se ainda não tiver

3. **Configurar `.env` na raiz** (usado só pelo `docker-compose.yml`) a
   partir de `.env.example`:
   - `SITE_DOMAIN`: o domínio real (ex.: `intranet.proferaldojunior.com.br`)
   - `VITE_AUTHENTICATOR_API_KEY`: **o mesmo valor** do `API_KEY` definido
     no `backend/.env` (é a mesma chave, o frontend precisa mandar ela em
     todo request)
   - `VITE_AUTHENTICATOR_API_URL`: deixe em branco (proxy same-origin)

4. **Rodar o schema no banco** (se ainda não tiver sido rodado nesse banco
   de produção) — `backend/db/schema.sql` no SQL Editor do Supabase — e
   popular com os funcionários reais (via `backend/db/set_senha.py` pro
   primeiro admin, e o resto pelo próprio painel de Administração depois
   de logado).

5. **Subir os containers:**
   ```bash
   docker compose up -d --build
   ```
   O primeiro build demora alguns minutos (baixa e indexa o modelo de
   embeddings do Assistente IA). Builds seguintes são mais rápidos.

6. **Conferir:**
   ```bash
   docker compose logs -f
   ```
   Espere o Caddy confirmar a emissão do certificado (procure por
   "certificate obtained successfully" no log). Depois, acesse
   `https://<seu-dominio>` e teste o login.

## Atualizando uma versão já no ar

```bash
git pull
docker compose up -d --build
```

## Rollback

```bash
git checkout <commit-anterior>
docker compose up -d --build
```

## Observações

- O container do backend não expõe porta pública diretamente (`expose`,
  não `ports`) — só é alcançável através do proxy do Caddy. Isso significa
  que `/api/*` só responde no domínio HTTPS real, não em `http://ip:8010`.
- Os dados do Let's Encrypt (certificado, chave) ficam em volumes Docker
  nomeados (`caddy_data`/`caddy_config`) — sobrevivem a um `docker compose
  down` normal; só se perdem com `docker compose down -v`.
- O banco (Supabase) é externo — não tem volume de dados neste
  `docker-compose.yml` pra backup. Backup do banco é responsabilidade do
  plano Supabase contratado.
