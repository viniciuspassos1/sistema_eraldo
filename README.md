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
- **Dashboard, Audiências, Documentos, Tribunais, Solicitações,
  Notificações e Administração** — visão personalizada por usuário logado
  e acesso rápido ao que o time usa todo dia.

## 3. Estrutura do projeto

```
.
├── index.html, assets/    → site institucional (estático, público)
├── intranet-app/          → frontend da intranet (React + TypeScript + Vite)
└── backend/                → API Python (FastAPI)
    ├── main.py             → ponto de entrada, monta os routers, CORS
    ├── security.py         → checagem da X-API-Key compartilhada
    ├── assistant/           → Assistente IA (RAG)
    │   ├── router.py        → endpoint POST /api/assistant/ask
    │   ├── rag.py            → busca semântica: embedding, ChromaDB, threshold, fallback
    │   └── ingest.py          → indexação: lê knowledge_base/*.{md,docx,pdf}, gera embeddings
    └── knowledge_base/      → documentos fonte (.md/.docx/.pdf) que o Assistente IA consulta
```

Não há build compilado versionado no repositório — `intranet-app/dist/` é
sempre gerado sob demanda (ver seção 8).

| Arquivo / pasta | Responsabilidade |
|---|---|
| `main.py` | App FastAPI; monta o router do Authenticator e do Assistente IA no mesmo processo |
| `security.py` | Valida a `X-API-Key` enviada pelo frontend, compartilhada pelos dois routers |
| `assistant/router.py` | Recebe a pergunta, delega pra `rag.py`, devolve resposta + fontes |
| `assistant/rag.py` | Transforma a pergunta em embedding, busca no ChromaDB, aplica o threshold de distância |
| `assistant/ingest.py` | Lê `knowledge_base/*.{md,docx,pdf}`, quebra em trechos, gera embeddings, grava no índice |
| `knowledge_base/` | Documentação fonte — hoje, Manual Interno + Base de Conhecimento transcritos |

## 4. Módulos envolvidos

| Módulo | Rota | Papel |
|---|---|---|
| Dashboard | `/` | Visão do dia personalizada por usuário logado |
| Meu Authenticator | `/meu-authenticator` | Códigos TOTP das contas de serviço, calculados no backend |
| Assistente IA | `/assistente-ia` | Busca na documentação interna (Processos Gerais) + apoio à redação (Comunicação) |
| Calendário do Escritório | `/calendario` | Agenda, férias, aniversários, feriados, avisos, funcionários e onboarding |
| Base de Conhecimento / Manual Interno | `/base-conhecimento`, `/manual` | Fonte que alimenta o Assistente IA |
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

## 6. Fluxo: Assistente IA (`backend/assistant/`)

### 6.1 Configuração (`rag.py` / `ingest.py`)

| Constante | Valor atual | Descrição |
|---|---|---|
| `EMBEDDING_MODEL` | `paraphrase-multilingual-mpnet-base-v2` | Modelo multilíngue, roda em CPU, usado pra gerar os vetores |
| `DISTANCE_THRESHOLD` | `0.65` | Distância de cosseno máxima aceita antes de cair no fallback |
| `MAX_CHUNK_CHARS` / `CHUNK_OVERLAP` | `800` / `100` | Tamanho e sobreposição dos trechos ao quebrar documentos longos |

### 6.2 Passo a passo

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

### 6.3 Regras de negócio implementadas

| # | Regra |
|---|---|
| 1 | Nenhum LLM reescreve a resposta — o texto devolvido é sempre o trecho literal do documento fonte |
| 2 | Pergunta fora de escopo (distância acima do threshold) → mensagem fixa de "não encontrei", nunca uma tentativa de resposta |
| 3 | Embeddings normalizados (`normalize_embeddings=True`) antes de indexar e antes de buscar, pra garantir que a distância de cosseno seja calculada corretamente |
| 4 | Título + categoria entram no texto usado pra gerar o embedding do documento (não só o corpo) — corrige casos onde o corpo sozinho não carrega sinal suficiente (ex.: "sistemas usados" sendo confundido com o documento de horário de expediente) |
| 5 | Aba "Comunicação" do Assistente IA não passa por esse fluxo — é geração assistida de texto, mockada, não consulta de documentos |

## 7. Pré-requisitos técnicos

- Node.js 18+ e npm (frontend)
- Python 3.10+ (backend)
- Dependências Python: `fastapi`, `uvicorn`, `pyotp`, `python-dotenv`,
  `chromadb`, `sentence-transformers` (`backend/requirements.txt`)
- Navegador moderno

## 8. Como executar

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
cp .env.example .env   # configure suas próprias chaves/segredos

./venv/Scripts/python.exe -m assistant.ingest        # indexa a documentação do Assistente IA
./venv/Scripts/python.exe -m uvicorn main:app --port 8010
```

Aponte o frontend pro backend local em `intranet-app/.env` (copie de
`.env.example`), usando a mesma `API_KEY` configurada em `backend/.env`.

Login de demonstração da intranet: ver `TEST_CREDENTIAL` em
`intranet-app/src/mocks/employees.ts` (não reproduzido aqui por segurança).

## 9. Configurações ajustáveis

| Config | Onde | Efeito |
|---|---|---|
| `EMBEDDING_MODEL` | `backend/assistant/rag.py` | Qualidade e velocidade da busca semântica; trocar exige rodar `ingest` de novo |
| `DISTANCE_THRESHOLD` | `backend/assistant/rag.py` | Menor = mais rigoroso (mais "não encontrei"); maior = mais permissivo |
| `MAX_CHUNK_CHARS` / `CHUNK_OVERLAP` | `backend/assistant/ingest.py` | Como documentos longos são divididos antes de indexar |
| `AUTH_SERVICE_N_NAME` / `AUTH_SERVICE_N_SECRET` | `backend/.env` | Contas de serviço disponíveis no Meu Authenticator |
| `ALLOWED_ORIGINS` | `backend/main.py` | Origens permitidas por CORS a chamar a API |

## 10. Limitações conhecidas e pontos de atenção

- **Autenticação da intranet é mockada** — checa e-mail/senha fixos no
  frontend, sem sessão real; qualquer role/perfil (ex. Administração) é só
  uma checagem client-side.
- **Dados de funcionários, audiências, documentos etc. são mocks fixos**
  em `intranet-app/src/mocks/` — não persistem entre sessões.
- **A `X-API-Key` do backend fica embutida no bundle público do
  frontend** (é compilada no JS estático pelo Vite) — não é uma proteção
  real caso o backend seja exposto além do localhost de um único
  desenvolvedor. Ver `DOCUMENTACAO.docx` para o achado completo de
  segurança.
- **Sem controle de acesso por setor/perfil no Assistente IA** — qualquer
  usuário autenticado (mock) vê toda a documentação indexada.
- **Sem LLM** — a resposta é o(s) trecho(s) literal(is); perguntas
  próximas do threshold podem trazer mais de um trecho concatenado, nem
  sempre 100% preciso.
- **Sem banco de dados real** — tudo roda em memória/mock no frontend; o
  Assistente IA e o Meu Authenticator são os únicos fluxos com backend de
  verdade.
- **Sem hospedagem nem deploy automatizado configurados ainda** — o
  projeto ainda não está publicado em lugar nenhum.

## 11. Glossário rápido

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

---

Documentação técnica completa (design system, o que é real x mockado por
módulo, roadmap sugerido): **`DOCUMENTACAO.docx`**.
