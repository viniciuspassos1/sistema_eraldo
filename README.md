# Intranet Eraldo Júnior Advocacia

## 1. Importância desta plataforma

Antes desta plataforma, o que a equipe do escritório precisa no dia a dia
estava espalhado: dúvida sobre um procedimento interno virava mensagem pra um
colega ou busca em pasta/chat antigo; os códigos de 2FA das contas de serviço
do escritório (e-mail, sistemas) dependiam do celular de uma pessoa
específica ter o app autenticador configurado; férias, aniversários,
feriados e avisos viviam em lugares diferentes, sem um ponto único de
consulta; e cada pessoa via a agenda e as audiências do escritório inteiro,
não só o que era dela. Isso custa tempo todo dia e cria pontos únicos de
falha:

- **Uma dúvida de procedimento interrompe alguém.** Sem uma fonte central
  consultável, a resposta certa depende de quem está por perto e lembra —
  ou de vasculhar documentos manualmente, toda vez que a dúvida se repete
  (o que acontece bastante com novos funcionários).
- **2FA amarrado a uma pessoa só.** Se quem tem o app autenticador de uma
  conta de serviço está de férias, viajando ou offline, ninguém mais
  consegue gerar o código e entrar naquela conta.
- **Informação de RH espalhada.** Férias, aniversários e feriados sem um
  lugar único fazem o time perder coisas simples — esquecer de parabenizar
  um colega, não perceber uma sobreposição de férias no mesmo setor.
- **Sem visão personalizada.** Ver a agenda/audiências do escritório
  inteiro em vez de só o que é seu obriga a filtrar mentalmente toda vez.

A plataforma resolve isso centralizando essas frentes num sistema único,
personalizado por quem está logado, com uma busca que responde com base na
documentação real do escritório (nunca inventando) em vez de depender da
memória de alguém.

## 2. Objetivo

Centralizar e, onde faz sentido, automatizar as seguintes frentes num único
sistema web:

- **Central de Ajuda** — chatbot de perguntas prontas, organizadas por
  categoria; cada uma responde com o conteúdo real de um artigo da Base de
  Conhecimento, sem busca aberta nem texto gerado.
- **Meu Authenticator** — cálculo de códigos TOTP (2FA) das contas de
  serviço do escritório, sem depender do celular de uma pessoa específica.
- **Calendário do Escritório** — agenda, férias, aniversários, feriados,
  avisos, quadro de funcionários e onboarding, unificados numa só área.
- **Dashboard, Documentos, Cooperativa de Ideias, Tribunais, Solicitações,
  Notificações e Administração** — visão personalizada por usuário logado
  e acesso rápido ao que o time usa todo dia.

## 3. Estrutura do projeto

```
.
├── site/                  → site institucional (estático, público) — index.html + assets/
├── docs/                  → documentação e materiais do projeto (DOCUMENTACAO.docx, proposta visual, levantamento de conteúdo)
├── intranet-app/          → frontend da intranet (React + TypeScript + Vite)
└── backend/                → API Python (FastAPI) + banco PostgreSQL (Supabase)
    ├── main.py             → ponto de entrada: monta os routers, CORS, pool de conexão (lifespan)
    ├── config.py            → variáveis de ambiente centralizadas (API_KEY, DATABASE_URL, JWT_SECRET, CORS...)
    ├── security.py          → X-API-Key, hash de senha (bcrypt), emissão/validação de sessão (JWT)
    ├── database.py          → pool de conexões com o Postgres (ThreadedConnectionPool) e helpers de query
    ├── routers/             → um módulo por área (auth, funcionarios, ferias, agenda, avisos, solicitacoes, chatbot...)
    └── db/
        ├── schema.sql        → schema PostgreSQL completo, já aplicado no Supabase (24 tabelas + RLS)
        ├── seed_*.py          → scripts que populam cada tabela com dados de demonstração
        └── set_senha.py       → utilitário de linha de comando pra definir/resetar a senha de um usuário
```

Não há build compilado versionado no repositório — `intranet-app/dist/` é
sempre gerado sob demanda (ver seção 8).

| Arquivo / pasta | Responsabilidade |
|---|---|
| `main.py` | App FastAPI; monta todos os routers (via `routers.all_routers`) no mesmo processo; abre/fecha o pool de conexão no ciclo de vida da aplicação |
| `config.py` | Único lugar que lê variáveis de ambiente — evita cada módulo repetir `os.getenv` |
| `security.py` | Valida a `X-API-Key`; funções de hash/verificação de senha (bcrypt); `require_user`/`require_admin` (dependências FastAPI que decodificam o token de sessão) |
| `database.py` | `get_connection()` (empresta do pool, com rollback automático em erro), `fetch_all`/`fetch_one` |
| `routers/` | Cada arquivo é um módulo de dados real (ex.: `funcionarios.py`, `agenda.py`, `onboarding.py`, `chatbot.py`), todos exigindo `X-API-Key`; os que agem em nome de "quem está logado" (Solicitações, Cooperativa de Ideias, Onboarding, Agenda → anotações, Avisos → leitura) também exigem o token de sessão |
| `routers/chatbot.py` | Central de Ajuda: CRUD das perguntas prontas (admin) + endpoint que devolve a pergunta com o conteúdo do artigo vinculado como resposta |
| `db/schema.sql` | Schema completo já aplicado no banco real (Supabase) — não é mais rascunho |

## 4. Módulos envolvidos

| Módulo | Rota | Papel |
|---|---|---|
| Dashboard | `/` | Visão do dia personalizada por usuário logado |
| Meu Authenticator | `/meu-authenticator` | Códigos TOTP das contas de serviço, calculados no backend |
| Central de Ajuda | `/assistente-ia` | Chatbot de perguntas prontas por categoria; resposta = conteúdo do artigo da Base de Conhecimento vinculado |
| Calendário do Escritório | `/calendario` | Agenda (grade semanal com anotações e alerta 10 min antes), férias, aniversários, feriados, avisos, funcionários e onboarding |
| Base de Conhecimento / Manual Interno | `/base-conhecimento`, `/manual` | Fonte que alimenta a Central de Ajuda |
| Cooperativa de Ideias | `/cooperativa-ideias` | Colaboradores sugerem ideias de conteúdo para redes sociais; equipe de marketing acompanha por status |
| Documentos, Tribunais, Solicitações, Notificações, Administração | — | Suporte operacional do dia a dia |

## 5. Fluxo: Meu Authenticator (`backend/main.py`)

### 5.1 Configuração

Cada conta de serviço é um bloco de duas variáveis em `backend/.env`:

| Variável | Descrição |
|---|---|
| `AUTH_SERVICE_N_NAME` | Nome de exibição da conta (N = 1, 2, 3...) |
| `AUTH_SERVICE_N_SECRET` | Chave secreta TOTP (Base32), obtida no momento em que o 2FA é configurado no serviço de origem |

`load_services()` lê essas variáveis em sequência (`N=1, 2, 3...`) até não
achar o próximo número — não há limite fixo de contas.

### 5.2 Regras

1. O segredo (`SECRET`) nunca sai do backend — só o código de 6 dígitos já
   calculado é devolvido ao frontend.
2. Código calculado via `pyotp` seguindo RFC 6238 (TOTP), mesmo algoritmo
   usado por qualquer app autenticador (Google Authenticator, Authy etc.) —
   por isso o código bate exatamente com o do celular.
3. Período padrão de 30s; `secondsRemaining` é calculado a cada request
   pra alimentar o contador regressivo no frontend.
4. Endpoint (`GET /api/authenticator/codes`) exige header `X-API-Key`
   válido (ver `security.py`).

## 6. Fluxo: Autenticação (`backend/routers/auth.py`)

1. **Login** (`POST /api/auth/login`) — recebe e-mail e senha, compara com o
   hash bcrypt salvo em `usuarios.senha_hash` e, se bater, devolve um token
   assinado (JWT) mais os dados do usuário (sem a senha).
2. **Sessão** — o frontend guarda o token em `localStorage` (se "Manter
   conectado") ou `sessionStorage`, e manda `Authorization: Bearer <token>`
   nas chamadas que precisam saber quem está logado. Ao recarregar a
   página, `GET /api/auth/me` valida o token e restaura a sessão.
3. **Identidade em vez de e-mail confiado** — endpoints que agem em nome do
   usuário (abrir uma solicitação, sugerir uma ideia, marcar um item do
   onboarding, criar uma anotação na Agenda, marcar um aviso como lido)
   usam `Depends(require_user)` para descobrir quem é o chamador a partir
   do token — o frontend não informa mais quem ele é, só prova via token.
4. **Perfil administrador** — `Depends(require_admin)` bloqueia com 403
   quem não tem `perfil = ADMINISTRADOR` (hoje usado no resumo de
   onboarding; outros endpoints administrativos podem reaproveitar a mesma
   dependência).
5. **Troca de senha** (`POST /api/auth/trocar-senha`) — o próprio usuário
   troca a senha informando a atual; não existe ainda um fluxo de "esqueci
   minha senha" (só o administrador pode resetar via `db/set_senha.py`).

## 7. Fluxo: Central de Ajuda (`backend/routers/chatbot.py`)

Não tem busca nem IA — é uma tabela de perguntas prontas (`chatbot_perguntas`),
cada uma ligada a um `documento_id` de `base_conhecimento`. Fluxo:

1. Admin cadastra a pergunta (texto, categoria, ordem, ativa/inativa) e
   escolhe qual artigo da Base de Conhecimento responde ela.
2. Funcionário abre `/assistente-ia`, vê as perguntas agrupadas por
   categoria, clica numa.
3. `GET /api/chatbot/perguntas/{id}` devolve a pergunta + `titulo`,
   `categoria` e `conteudo` do artigo vinculado — esse conteúdo é a
   resposta, mostrada tal como está escrito na Base de Conhecimento, sem
   nenhuma transformação.
4. Se o artigo vinculado tiver sido apagado depois (`documento_id` fica
   `null` — `ON DELETE SET NULL`), a resposta vem com
   `documentoEncontrado: false` em vez de dar erro.

Toda criação/edição/exclusão de pergunta passa por `registrar_log`/
`registrar_edicao` (`backend/logs.py`), igual ao resto do sistema — aparece
em Logs de auditoria com o "de → para" de cada campo alterado.

## 8. Pré-requisitos técnicos

- Node.js 18+ e npm (frontend)
- Python 3.10+ (backend)
- Um projeto Supabase (PostgreSQL gerenciado) — ou qualquer Postgres
  acessível via connection string
- Dependências Python: `fastapi`, `uvicorn`, `psycopg2-binary`, `bcrypt`,
  `PyJWT`, `pyotp`, `python-dotenv`, `google-genai` (`backend/requirements.txt`)
- Navegador moderno

## 9. Como executar

### Frontend

```bash
cd intranet-app
npm install
npm run dev        # http://localhost:5173
```

### Backend

```bash
cd backend
python3 -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
cp .env.example .env   # configure DATABASE_URL, API_KEY e JWT_SECRET (ver comentários no arquivo)

./venv/Scripts/python.exe -m uvicorn main:app --port 8010
```

Primeira vez rodando contra um banco novo: aplique `db/schema.sql` no
Supabase (SQL Editor) e, se quiser dados de demonstração, rode os scripts
em `db/seed_*.py` (ex.: `./venv/Scripts/python.exe -m db.seed_usuarios`).

Aponte o frontend pro backend local em `intranet-app/.env` (copie de
`.env.example`), usando a mesma `API_KEY` configurada em `backend/.env`.

Login: use um e-mail cadastrado em `usuarios` com senha definida via
`./venv/Scripts/python.exe -m db.set_senha <email> <senha>` — não existe
mais credencial fixa hardcoded no frontend.

## 10. Configurações ajustáveis

| Config | Onde | Efeito |
|---|---|---|
| `AUTH_SERVICE_N_NAME` / `AUTH_SERVICE_N_SECRET` | `backend/.env` | Contas de serviço disponíveis no Meu Authenticator |
| `DATABASE_URL` | `backend/.env` | Connection string do Postgres (Supabase — usar a versão "Session pooler" se a rede não tiver rota IPv6) |
| `JWT_SECRET` / `JWT_EXPIRES_HOURS_SESSAO` / `JWT_EXPIRES_HOURS_PERSISTENTE` | `backend/.env` | Chave de assinatura e validade do token de sessão (login) |
| `DB_POOL_MIN` / `DB_POOL_MAX` | `backend/.env` | Tamanho do pool de conexões com o banco |
| `ALLOWED_ORIGINS` | `backend/.env` | Origens permitidas por CORS a chamar a API |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | `backend/.env` | IA generativa (Gemini) usada só no "ajudar a redigir" da Cooperativa de Ideias — sem chave, fica desativado com erro claro |

## 11. Limitações conhecidas e pontos de atenção

- **Audiências não tem mais página própria** — foi removida da sidebar a
  pedido do escritório. Audiências continuam representadas como um `tipo`
  dentro de Agenda (`agenda_eventos`/`agenda_anotacoes`); a tabela solta
  `audiencias`, que nunca teve endpoint ligado a ela, foi removida do banco.
- **Meu Authenticator continua lendo os segredos TOTP do `.env`**, não do
  banco — a tabela `authenticator_contas` existe no schema mas não está
  em uso.
- **Conteúdo real do escritório ainda não populado por completo** — Base
  de Conhecimento e Documentos têm estrutura e API reais, mas parte do
  conteúdo ainda é texto de exemplo; Manual Interno e Tribunais já foram
  atualizados com conteúdo real do escritório. Ver
  `docs/Levantamento_Conteudo_Necessario.docx`.
- **A `X-API-Key` do backend fica embutida no bundle público do
  frontend** (é compilada no JS estático pelo Vite). Isso é uma segunda
  camada — a identidade de quem age (Solicitações, Onboarding etc.) vem
  do token de sessão, não da API Key — mas a chave em si ainda não é
  segredo de verdade num app publicado. Ver `docs/DOCUMENTACAO.docx`.
- **Sem fluxo de "esqueci minha senha"** — só um administrador pode
  resetar a senha de alguém, via `db/set_senha.py`.
- **Central de Ajuda não usa LLM nem busca, por decisão deliberada** — a
  resposta de cada pergunta pronta é sempre o texto literal do artigo da
  Base de Conhecimento vinculado a ela pelo admin, pra nunca inventar
  informação sobre processo interno. O "ajudar a redigir" da Cooperativa
  de Ideias é o único lugar do sistema que usa um LLM de verdade (Gemini)
  — ver `backend/README.md`.
- **Alerta sonoro da Agenda ainda depende da aba aberta**, mas agora tem
  um lembrete por e-mail complementar (`backend/jobs.py`) — que por sua
  vez depende de SMTP real configurado, que este projeto ainda não tem
  (`ENABLE_BACKGROUND_JOBS`/`SMTP_*` em `backend/.env.example`).
- **Ainda não publicado em produção** — `Dockerfile`/`docker-compose.yml`/
  `DEPLOY.md` já existem e cobrem o passo a passo de deploy numa VPS
  (Docker + Caddy com HTTPS automático), mas o deploy em si ainda não foi
  feito. Banco de produção separado do banco de desenvolvimento (dois
  projetos Supabase distintos).

Itens que **já foram resolvidos** nesta mesma fase do projeto (documentados
aqui só para não achar, por engano, que ainda são limitações): Dashboard,
Administração e Meu Perfil usam dados reais (sem mocks); há permissão de
acesso por página, editável por administrador (`permissoes_acesso`);
rate limiting de login (5 tentativas / 15 min); auditoria completa com
valor anterior/novo em toda edição (`backend/logs.py`); suíte de testes
automatizados (`backend/tests/`); widget
"Minhas pendências" no Dashboard (onboarding, solicitações, atestados,
cooperativa de ideias num só lugar).

## 12. Glossário rápido

- **TOTP (Time-based One-Time Password)** — algoritmo padrão (RFC 6238)
  que calcula um código de 6 dígitos a partir de um segredo compartilhado
  e do relógio atual; é o mesmo algoritmo usado por qualquer app
  autenticador.
- **Mock** — dado ou comportamento simulado no frontend, sem backend real
  por trás.
- **JWT (JSON Web Token)** — token de sessão assinado pelo backend; prova
  quem é o usuário sem precisar guardar sessão em banco (stateless).
- **bcrypt** — algoritmo de hash de senha; a senha em si nunca é
  armazenada, só o resultado do hash, que não dá pra reverter.

---

Documentação técnica completa (design system, o que é real x mockado por
módulo, roadmap sugerido): **`docs/DOCUMENTACAO.docx`**.
