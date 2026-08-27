# Backend — API da Intranet

API em Python (FastAPI) com banco PostgreSQL real (Supabase): autenticação
de usuários, todos os módulos de dados da intranet (funcionários, agenda,
férias, avisos, solicitações etc.), Meu Authenticator (códigos TOTP) e o
Assistente IA (busca semântica sobre a documentação interna).

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
| `assistant/` | Assistente IA — RAG sobre `knowledge_base/` |
| `db/schema.sql` | Schema completo (18 tabelas), já aplicado no Supabase |
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

## Assistente IA (busca na documentação interna)

Mesmo backend, mesma porta, mesma `API_KEY` — só mais um endpoint:
`POST /api/assistant/ask`. Faz busca semântica (RAG) sobre os arquivos
`.md`, `.docx` e `.pdf` em `backend/knowledge_base/`, com ChromaDB +
Sentence Transformers, e devolve o trecho da documentação que melhor
responde à pergunta, **sem inventar nada e sem LLM reescrevendo** — a
resposta é o texto original do documento mais a fonte.

Depois de instalar `requirements.txt` (venv já criado acima), indexe a base:

```bash
cd backend
./venv/Scripts/python.exe -m assistant.ingest   # Windows
# ./venv/bin/python -m assistant.ingest         # Mac/Linux
```

Isso baixa o modelo de embeddings na primeira vez (uso único, fica em cache)
e grava o índice em `backend/chroma_data/` (não sobe pro git). Rode de novo
sempre que adicionar, editar ou remover arquivos em `knowledge_base/`.

Pra adicionar documentação nova, basta soltar o arquivo em
`knowledge_base/<pasta>/` — não precisa mexer em código:

- **`.md`** (recomendado quando dá pra escrever direto): aceita um
  cabeçalho simples pra definir título e categoria manualmente —

  ```markdown
  ---
  titulo: Nome do documento
  categoria: Setor ou categoria
  ---

  Conteúdo do documento aqui.
  ```

- **`.docx`** ou **`.pdf`**: pode subir o arquivo como está (ex.: um manual
  já pronto do escritório). Não tem cabeçalho, então o título vira o nome
  do arquivo e a categoria vira o nome da pasta onde ele foi colocado — dá
  pra editar isso depois direto no Chroma se precisar, mas geralmente já
  fica bom o suficiente.

Depois é só rodar o `ingest` de novo.

## Meu Authenticator

API mínima que calcula códigos TOTP a partir de segredos guardados só no
`.env` do servidor (ver `intranet-app/docs/meu-authenticator-arquitetura.md`
para a arquitetura completa, incluindo o checklist de segurança pra uma
versão de produção real com contas reais do escritório).

## Importante

Antes de usar com contas/dados reais do escritório em produção: revisar o
checklist de segurança do Meu Authenticator, mover os `.env` de produção
pra um cofre de segredos de verdade, e considerar rate limiting no login
(hoje não existe bloqueio por tentativas incorretas).
