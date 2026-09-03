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

- **Assistente IA** — busca semântica (RAG) real sobre a documentação
  interna do escritório, respondendo com a fonte citada.
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
    ├── routers/             → um módulo por área (auth, funcionarios, ferias, agenda, avisos, solicitacoes...)
    ├── assistant/           → Assistente IA (RAG)
    │   ├── router.py        → endpoint POST /api/assistant/ask
    │   ├── rag.py            → busca semântica: embedding, ChromaDB, threshold, fallback
    │   └── ingest.py          → indexação: lê knowledge_base/*.{md,docx,pdf}, gera embeddings
    ├── knowledge_base/      → documentos fonte (.md/.docx/.pdf) que o Assistente IA consulta
    └── db/
        ├── schema.sql        → schema PostgreSQL completo, já aplicado no Supabase (18 tabelas + RLS)
        ├── seed_*.py          → scripts que populam cada tabela com dados de demonstração
        └── set_senha.py       → utilitário de linha de comando pra definir/resetar a senha de um usuário
```

Não há build compilado versionado no repositório — `intranet-app/dist/` é
sempre gerado sob demanda (ver seção 8).

| Arquivo / pasta | Responsabilidade |
|---|---|
| `main.py` | App FastAPI; monta todos os routers (via `routers.all_routers`) e o do Assistente IA no mesmo processo; abre/fecha o pool de conexão no ciclo de vida da aplicação |
| `config.py` | Único lugar que lê variáveis de ambiente — evita cada módulo repetir `os.getenv` |
| `security.py` | Valida a `X-API-Key`; funções de hash/verificação de senha (bcrypt); `require_user`/`require_admin` (dependências FastAPI que decodificam o token de sessão) |
| `database.py` | `get_connection()` (empresta do pool, com rollback automático em erro), `fetch_all`/`fetch_one` |
| `routers/` | Cada arquivo é um módulo de dados real (ex.: `funcionarios.py`, `agenda.py`, `onboarding.py`), todos exigindo `X-API-Key`; os que agem em nome de "quem está logado" (Solicitações, Cooperativa de Ideias, Onboarding, Agenda → anotações, Avisos → leitura) também exigem o token de sessão |
| `assistant/router.py` | Recebe a pergunta, delega pra `rag.py`, devolve resposta + fontes |
| `assistant/rag.py` | Transforma a pergunta em embedding, busca no ChromaDB, aplica o threshold de distância |
| `assistant/ingest.py` | Lê `knowledge_base/*.{md,docx,pdf}`, quebra em trechos, gera embeddings, grava no índice |
| `knowledge_base/` | Documentação fonte — hoje, Manual Interno + Base de Conhecimento transcritos |
| `db/schema.sql` | Schema completo já aplicado no banco real (Supabase) — não é mais rascunho |

## 4. Módulos envolvidos

| Módulo | Rota | Papel |
|---|---|---|
| Dashboard | `/` | Visão do dia personalizada por usuário logado |
| Meu Authenticator | `/meu-authenticator` | Códigos TOTP das contas de serviço, calculados no backend |
| Assistente IA | `/assistente-ia` | Busca na documentação interna (Processos Gerais) + apoio à redação (Comunicação) |
| Calendário do Escritório | `/calendario` | Agenda (grade semanal com anotações e alerta 10 min antes), férias, aniversários, feriados, avisos, funcionários e onboarding |
| Base de Conhecimento / Manual Interno | `/base-conhecimento`, `/manual` | Fonte que alimenta o Assistente IA |
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

## 7. Fluxo: Assistente IA (`backend/assistant/`)

### 7.1 Configuração (`rag.py` / `ingest.py`)

| Constante | Valor atual | Descrição |
|---|---|---|
| `EMBEDDING_MODEL` | `paraphrase-multilingual-mpnet-base-v2` | Modelo multilíngue, roda em CPU, usado pra gerar os vetores |
| `DISTANCE_THRESHOLD` | `0.65` | Distância de cosseno máxima aceita antes de cair no fallback |
| `MAX_CHUNK_CHARS` / `CHUNK_OVERLAP` | `800` / `100` | Tamanho e sobreposição dos trechos ao quebrar documentos longos |

### 7.2 Passo a passo

1. **Indexação** (`python -m assistant.ingest`) — lê cada `.md`, `.docx` ou
   `.pdf` de `knowledge_base/`. Em `.md`, título e categoria vêm do
   front-matter (`titulo`, `categoria`); em `.docx`/`.pdf`, que não têm
   front-matter, título e categoria são inferidos do nome do arquivo e da
   pasta. Depois quebra o corpo em trechos por parágrafo, gera o embedding
   de `"{titulo} — {categoria}\n{trecho}"` (o título entra no cálculo do
   vetor pra dar mais sinal de busca, mas não aparece na resposta) e grava
   no ChromaDB (`backend/chroma_data/`, local, fora do git).
2. **Pergunta** (`POST /api/assistant/ask`) — a pergunta do usuário é
   transformada em embedding com o mesmo modelo.
3. **Busca** — o ChromaDB devolve os `top_k` trechos mais próximos por
   distância de cosseno.
4. **Decisão** — se o trecho mais próximo estiver acima do
   `DISTANCE_THRESHOLD`, devolve a mensagem fixa de "não encontrei"; caso
   contrário, junta até 2 trechos relevantes (sem duplicar a mesma fonte)
   e devolve como resposta, com a fonte (`titulo` + `categoria`) de cada um.

### 7.3 Regras de negócio implementadas

| # | Regra |
|---|---|
| 1 | Nenhum LLM reescreve a resposta — o texto devolvido é sempre o trecho literal do documento fonte |
| 2 | Pergunta fora de escopo (distância acima do threshold) → mensagem fixa de "não encontrei", nunca uma tentativa de resposta |
| 3 | Embeddings normalizados (`normalize_embeddings=True`) antes de indexar e antes de buscar, pra garantir que a distância de cosseno seja calculada corretamente |
| 4 | Título + categoria entram no texto usado pra gerar o embedding do documento (não só o corpo) — corrige casos onde o corpo sozinho não carrega sinal suficiente (ex.: "sistemas usados" sendo confundido com o documento de horário de expediente) |
| 5 | Aba "Comunicação" do Assistente IA não passa por esse fluxo — é geração assistida de texto, mockada, não consulta de documentos |

## 8. Pré-requisitos técnicos

- Node.js 18+ e npm (frontend)
- Python 3.10+ (backend)
- Um projeto Supabase (PostgreSQL gerenciado) — ou qualquer Postgres
  acessível via connection string
- Dependências Python: `fastapi`, `uvicorn`, `psycopg2-binary`, `bcrypt`,
  `PyJWT`, `pyotp`, `python-dotenv`, `chromadb`, `sentence-transformers`
  (`backend/requirements.txt`)
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

./venv/Scripts/python.exe -m assistant.ingest        # indexa a documentação do Assistente IA
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
| `EMBEDDING_MODEL` | `backend/assistant/rag.py` | Qualidade e velocidade da busca semântica; trocar exige rodar `ingest` de novo |
| `DISTANCE_THRESHOLD` | `backend/assistant/rag.py` | Menor = mais rigoroso (mais "não encontrei"); maior = mais permissivo |
| `MAX_CHUNK_CHARS` / `CHUNK_OVERLAP` | `backend/assistant/ingest.py` | Como documentos longos são divididos antes de indexar |
| `AUTH_SERVICE_N_NAME` / `AUTH_SERVICE_N_SECRET` | `backend/.env` | Contas de serviço disponíveis no Meu Authenticator |
| `DATABASE_URL` | `backend/.env` | Connection string do Postgres (Supabase — usar a versão "Session pooler" se a rede não tiver rota IPv6) |
| `JWT_SECRET` / `JWT_EXPIRES_HOURS_SESSAO` / `JWT_EXPIRES_HOURS_PERSISTENTE` | `backend/.env` | Chave de assinatura e validade do token de sessão (login) |
| `DB_POOL_MIN` / `DB_POOL_MAX` | `backend/.env` | Tamanho do pool de conexões com o banco |
| `ALLOWED_ORIGINS` | `backend/.env` | Origens permitidas por CORS a chamar a API |

## 11. Limitações conhecidas e pontos de atenção

- **Audiências não tem mais página própria** — foi removida da sidebar a
  pedido do escritório; a tabela `audiencias` existe no schema, mas sem
  nenhum endpoint ligado a ela.
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
- **Sem LLM** — a resposta é o(s) trecho(s) literal(is); perguntas
  próximas do threshold podem trazer mais de um trecho concatenado, nem
  sempre 100% preciso. Duas perguntas ("missão" e "visão" da empresa)
  ainda retornam o trecho errado por limitação do modelo de embeddings —
  ver `backend/README.md`.
- **Alerta sonoro da Agenda ainda depende da aba aberta**, mas agora tem
  um lembrete por e-mail complementar (`backend/jobs.py`) — que por sua
  vez depende de SMTP real configurado, que este projeto ainda não tem
  (`ENABLE_BACKGROUND_JOBS`/`SMTP_*` em `backend/.env.example`).
- **Sem hospedagem nem deploy automatizado configurados ainda** — o
  projeto roda localmente (frontend + backend) contra o banco real do
  Supabase, mas ainda não está publicado em nenhum servidor/domínio.

Itens que **já foram resolvidos** nesta mesma fase do projeto (documentados
aqui só para não achar, por engano, que ainda são limitações): Dashboard,
Administração e Meu Perfil usam dados reais (sem mocks); há permissão de
acesso por página, editável por administrador (`permissoes_acesso`);
rate limiting de login (5 tentativas / 15 min); RBAC por setor no
Assistente IA; suíte de testes automatizados (`backend/tests/`); widget
"Minhas pendências" no Dashboard (onboarding, solicitações, atestados,
cooperativa de ideias num só lugar).

## 12. Glossário rápido

- **RAG (Retrieval-Augmented Generation)** — aqui, só a parte de
  "Retrieval": busca por similaridade semântica, sem geração de texto por
  LLM.
- **TOTP (Time-based One-Time Password)** — algoritmo padrão (RFC 6238)
  que calcula um código de 6 dígitos a partir de um segredo compartilhado
  e do relógio atual; é o mesmo algoritmo usado por qualquer app
  autenticador.
- **Embedding** — representação numérica (vetor) de um texto, usada para
  comparar significado por similaridade, não por palavra exata.
- **Chunk** — pedaço de um documento indexado individualmente para busca.
- **Threshold de distância** — limite de "quão parecido" um trecho
  precisa ser da pergunta para virar resposta; acima disso, o sistema
  prefere dizer "não encontrei" a arriscar.
- **Mock** — dado ou comportamento simulado no frontend, sem backend real
  por trás.
- **JWT (JSON Web Token)** — token de sessão assinado pelo backend; prova
  quem é o usuário sem precisar guardar sessão em banco (stateless).
- **bcrypt** — algoritmo de hash de senha; a senha em si nunca é
  armazenada, só o resultado do hash, que não dá pra reverter.

---

Documentação técnica completa (design system, o que é real x mockado por
módulo, roadmap sugerido): **`docs/DOCUMENTACAO.docx`**.
