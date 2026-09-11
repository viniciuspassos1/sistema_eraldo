# Backend — API da Intranet

API em Python (FastAPI) com banco PostgreSQL real (Supabase): autenticação
de usuários, todos os módulos de dados da intranet (funcionários, agenda,
férias, avisos, solicitações etc.), Meu Authenticator (códigos TOTP) e o
Central de Ajuda (chatbot de perguntas prontas ligadas à Base de Conhecimento).

## Rodando localmente

```bash
cd backend
python3 -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt  # Mac/Linux

cp .env.example .env
```

Edite o `.env` (cada variável tem um comentário explicando de onde tirar o
valor):

- `API_KEY`: chave compartilhada que o frontend envia em toda chamada
  (`X-API-Key`). Gere com `openssl rand -hex 32`.
- `DATABASE_URL`: connection string do Postgres. Se for Supabase, pegue em
  Project Settings → Database → Connection string → URI — use a versão
  **Session pooler** se a rede não tiver rota IPv6 (a "Direct connection"
  do Supabase é IPv6-only).
- `JWT_SECRET`: chave de assinatura do token de sessão (login). Gere com
  `python -c "import secrets; print(secrets.token_hex(32))"`. Nunca
  reaproveite entre ambientes.
- `AUTH_SERVICE_N_NAME` / `AUTH_SERVICE_N_SECRET`: contas do Meu
  Authenticator — nome do serviço e a chave secreta em texto que aparece
  no momento em que você ativa um 2FA **novo** em algum lugar (não
  funciona com um Authenticator já configurado antes — o segredo só
  existe nesse momento inicial).

Se for um banco novo, aplique o schema (SQL Editor do Supabase ou
`psql`):

```bash
# cole o conteúdo de db/schema.sql no SQL Editor do Supabase e rode
```

E, se quiser dados de demonstração, rode os seeds (idempotentes, podem
rodar de novo sem duplicar):

```bash
./venv/Scripts/python.exe -m db.seed_usuarios
./venv/Scripts/python.exe -m db.seed_ferias
# ... um seed por módulo, ver db/seed_*.py
```

Defina uma senha pra pelo menos um usuário pra conseguir logar:

```bash
./venv/Scripts/python.exe -m db.set_senha eraldo.junior@proferaldojunior.com.br "uma-senha-forte"
```

Suba o servidor:

```bash
./venv/Scripts/python.exe -m uvicorn main:app --port 8010
```

No `intranet-app/.env`, aponte para essa porta e use a mesma `API_KEY`:

```
VITE_AUTHENTICATOR_API_URL=http://localhost:8010
VITE_AUTHENTICATOR_API_KEY=<mesma chave do backend/.env>
```

## Arquitetura

| Arquivo / pasta | Papel |
|---|---|
| `main.py` | Monta todos os routers, CORS, abre/fecha o pool de conexão no lifespan da app |
| `config.py` | Único lugar que lê variáveis de ambiente |
| `security.py` | `X-API-Key`; hash/verificação de senha (bcrypt); emissão e validação do token de sessão (JWT); `require_user` / `require_admin` |
| `database.py` | Pool de conexões (`ThreadedConnectionPool`) e helpers `fetch_all` / `fetch_one` / `get_connection()` |
| `routers/` | Um arquivo por módulo de dados (ver tabela abaixo) |
| `db/schema.sql` | Schema completo (24 tabelas), já aplicado no Supabase |
| `db/seed_*.py` | Um script por tabela, popula dados de demonstração |
| `db/set_senha.py` | CLI para definir/resetar a senha de um usuário |

Todo router exige `X-API-Key`. Os que agem em nome de "quem está logado"
(não recebem mais e-mail/id no corpo — descobrem pelo token) exigem também
`Authorization: Bearer <token>`:

| Router | Precisa de sessão (token)? |
|---|---|
| `auth` | Login não precisa; `/me` e `/trocar-senha` sim |
| `solicitacoes` (criar) | Sim |
| `cooperativa_ideias` (criar) | Sim |
| `onboarding` (progresso próprio) | Sim |
| `onboarding` (resumo — admin) | Sim, e exige perfil ADMINISTRADOR |
| `agenda_anotacoes` (tudo) | Sim |
| `avisos` (listar e marcar lido) | Sim |
| `pendencias` | Sim |
| `notas_pessoais` (tudo) | Sim |
| Demais (`funcionarios`, `ferias`, `feriados`, `agenda` eventos, `documentos`, `tribunais`, `base_conhecimento`, `manual_interno`, `notificacoes`) | Só `X-API-Key` — leitura sem identidade |

## Autenticação

- Senha guardada como hash bcrypt (`usuarios.senha_hash`) — nunca em
  texto plano.
- Login (`POST /api/auth/login`) devolve um JWT; o frontend manda esse
  token em `Authorization: Bearer` nas chamadas que precisam saber quem
  está logado.
- `GET /api/auth/me` valida o token e devolve os dados do usuário — usado
  pra restaurar a sessão ao recarregar a página.
- `POST /api/auth/trocar-senha` deixa o próprio usuário trocar a senha
  informando a atual. Não existe fluxo de "esqueci minha senha" — reset
  fica a cargo de um administrador via `db/set_senha.py`.

## Central de Ajuda (chatbot de perguntas prontas)

Substituiu o antigo "Assistente IA" (que tinha busca semântica livre numa
aba e geração de texto via Gemini na outra — ambos removidos). Hoje é bem
mais simples e não depende de IA nenhuma: `routers/chatbot.py` expõe
`chatbot_perguntas` (pergunta + categoria + `documento_id`, ligado a um
artigo de `base_conhecimento`). Clicar numa pergunta pronta no frontend
busca `GET /api/chatbot/perguntas/{id}`, que devolve o conteúdo do artigo
vinculado como resposta — sempre o texto original do documento, nunca texto
gerado. Cadastro/edição/exclusão das perguntas é feito pelo próprio painel
(admin), sem precisar editar código nem rodar nenhum script de indexação.

A remoção do motor de busca semântica (`sentence-transformers`,
`rank-bm25`, modelo de embeddings de ~1.1GB) também tirou uma dependência
pesada e um passo lento de build (o Dockerfile não baixa mais modelo
nenhum) — o único motivo de existirem era a busca livre que não existe
mais.

## Jobs de fundo (lembrete por e-mail, onboarding parado, SLA de solicitações)

Três alertas que não dependem de alguém estar com a intranet aberta na tela,
implementados em `jobs.py` como dois loops assíncronos iniciados no lifespan
do FastAPI (sem scheduler externo):

- **Lembrete de reunião por e-mail** — complementar ao alerta sonoro do
  frontend (`AgendaAlerts.tsx`, que só dispara com a aba aberta). A cada 60s,
  verifica eventos da Agenda e anotações pessoais de hoje entre 0 e 10
  minutos de distância e manda um e-mail ao responsável/dono, uma vez só por
  evento (`lembrete_email_enviado`).
- **Onboarding parado** — a cada 6h, avisa (notificação interna) o próprio
  funcionário e os administradores quando o checklist de onboarding não
  avança há 7 dias ou mais.
- **SLA de solicitações** — a cada 6h, avisa o responsável (ou os
  administradores, se a solicitação não tiver responsável) quando ela
  continua aberta/em análise 5 dias ou mais depois de criada.

**Desligado por padrão** (`ENABLE_BACKGROUND_JOBS=false`) — inclusive
durante os testes automatizados, de propósito: os testes sobem o app real
via `TestClient`, e sem esse cuidado cada rodada de teste dispararia
notificações reais para funcionários reais. Para ativar em produção:

```
ENABLE_BACKGROUND_JOBS=true
```

O lembrete por e-mail precisa, além disso, de SMTP configurado
(`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — ver
`.env.example`). **Sem essas credenciais reais do escritório, esse e-mail
específico fica desativado silenciosamente** (os avisos de onboarding/SLA
continuam funcionando normalmente, pois são notificações internas, não
e-mail) — nenhum envio de e-mail foi testado de ponta a ponta neste projeto
por falta de um servidor SMTP real para testar contra.

## IA generativa (Gemini) — "ajudar a redigir" da Cooperativa de Ideias

Único recurso do sistema que usa um LLM de verdade (`llm.py`, Google
Gemini) para gerar texto — a Central de Ajuda não usa, de propósito,
respondendo sempre com o texto literal do artigo vinculado:

- **`POST /api/cooperativa-ideias/redigir`** — botão "Ajudar a escrever" no
  formulário de nova ideia: a partir de título/formato/tema, sugere uma
  descrição para a ideia de conteúdo.

Sem `GEMINI_API_KEY` configurada, devolve HTTP 503 com uma mensagem clara
em vez de quebrar a tela — nenhum outro recurso do sistema depende disso.
Para ativar:

```
GEMINI_API_KEY=sua-chave-aqui
GEMINI_MODEL=gemini-flash-lite-latest   # opcional, esse já é o padrão
```

Gere a chave em <https://aistudio.google.com/apikey> — tem tier gratuito
com limite de uso (ao esgotar, a API para de responder, não cobra
automaticamente).

O modelo padrão usa o alias `-latest` (em vez de um nome de versão fixo)
de propósito: durante o desenvolvimento, `gemini-2.0-flash` já tinha sido
descontinuado pelo Google, e os sucessores diretos (`gemini-3.6-flash`,
`gemini-3.7-flash`) devolviam 503 "alta demanda" no tier gratuito — a
variante "lite" respondeu de forma estável. Um alias `-latest` reduz a
chance de o modelo configurado simplesmente parar de existir de novo; se
`GEMINI_MODEL` começar a devolver 404 ou 503 persistente, rode
`client.models.list()` (ver histórico do projeto) para ver o que está
disponível para a chave configurada.

## Meu Authenticator

API mínima que calcula códigos TOTP a partir de segredos guardados só no
`.env` do servidor (ver `intranet-app/docs/meu-authenticator-arquitetura.md`
para a arquitetura completa, incluindo o checklist de segurança pra uma
versão de produção real com contas reais do escritório).

## Logs de auditoria

`backend/logs.py` (`registrar_log` / `registrar_edicao`) grava em
`logs_auditoria` quem fez o quê e quando — consultável em `/api/logs`
(admin-only, com filtros por usuário, ação, status, documento e período) e
na tela "Logs de auditoria" da Administração. Nunca derruba a requisição
que originou o log (falha ao gravar é só logada no stdout).

Cobertura hoje: login (sucesso, falha e bloqueio por rate limit), logout,
troca de senha, Documentos, Base de Conhecimento, Atestados (enviar,
aprovar/recusar, visualizar arquivo), Colaboradores, Funcionários, Férias,
Feriados, Avisos, Tribunais, Agenda (eventos oficiais), Permissões,
Cooperativa de Ideias, Solicitações, progresso de Onboarding e Backups.

Toda ação de **edição** usa `registrar_edicao(usuario_id, acao, entidade,
entidade_id, anterior, novo)`, que compara os dois dicts e só grava os
campos que de fato mudaram, no formato `{"campo": {"de": ..., "para":
...}}` — é esse formato que a tela de Logs reconhece pra mostrar "de →
para" no modal de detalhe, em vez de só o valor novo.

**Lacuna conhecida:** Manual Interno (`manual_interno_capitulos`) não tem
nenhum endpoint de criação/edição/exclusão ainda (conteúdo só existe por
ter sido inserido direto no banco) — não há o que auditar até esse CRUD
existir. `notas_pessoais` e `agenda_anotacoes` ficam fora de propósito: são
dados pessoais/privados do próprio usuário, não administrativos.

Imutabilidade: não existe (e não deve existir) rota `PUT`/`DELETE` para
`/api/logs` — o único jeito de escrever na tabela é via `registrar_log`,
chamado só pelo backend. RLS já habilitado em `logs_auditoria` no schema.

## Testes automatizados

```bash
cd backend
./venv/Scripts/pip.exe install -r requirements-dev.txt   # pytest + httpx, só pra rodar os testes
./venv/Scripts/python.exe -m pytest tests/ -v
```

Roda contra o banco real (Supabase) usando as contas de demonstração já
seedadas — não existe banco de teste separado. Por isso os testes que
criam dado (solicitação, ideia, atestado) apagam o que criaram ao final,
e nenhum teste altera senha ou dado de conta que outra pessoa usa pra
navegar na intranet. Cobre login/sessão, bloqueio por tentativas
incorretas, `require_admin`/`require_pagina` (bloqueio e liberação),
isolamento de acesso a arquivo de atestado entre usuários, identidade
via token (não confiar em e-mail vindo do corpo da requisição), e as
checagens dos jobs de fundo (`jobs.py` — geração e dedupe do alerta de
SLA de solicitações).

## Importante

Antes de usar com contas/dados reais do escritório em produção: revisar o
checklist de segurança do Meu Authenticator, mover os `.env` de produção
pra um cofre de segredos de verdade, e rodar `pip-audit -r requirements.txt`
periodicamente (ver seção de segurança do `docs/DOCUMENTACAO.docx`).
