-- =============================================================================
-- Intranet Eraldo Júnior Advocacia — schema do banco (PostgreSQL / Supabase)
-- =============================================================================
-- Traduz os dados que hoje são mocks no frontend (intranet-app/src/mocks/*.ts)
-- para tabelas reais. Rode este arquivo inteiro no SQL Editor do Supabase, ou
-- conecte o DBeaver no projeto Supabase e execute por aqui.
--
-- Convenções:
--   - PK sempre uuid (gen_random_uuid()), igual ao padrão que o frontend já
--     usa em alguns lugares (crypto.randomUUID()).
--   - created_at / updated_at em toda tabela que representa um registro que
--     alguém cria (não em tabelas de catálogo fixo, como feriados).
--   - Nomes de tabela e coluna em português, snake_case, espelhando os
--     campos que já existem nos types do frontend (intranet-app/src/types/index.ts)
--     para facilitar o mapeamento na hora de escrever a API.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. USUÁRIOS — tabela central. Tudo mais referencia esta.
-- =============================================================================

create type perfil_usuario as enum ('ADMINISTRADOR', 'GESTOR', 'FUNCIONARIO');
create type status_usuario as enum ('ATIVO', 'INATIVO', 'FERIAS');

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  senha_hash text not null, -- hash bcrypt; login real via backend/routers/auth.py
  cargo text not null,
  setor text not null,
  foto_url text,
  perfil perfil_usuario not null default 'FUNCIONARIO',
  data_entrada date not null,
  aniversario date not null, -- só dia/mês importam pro app, mas guarda a data completa
  telefone text,
  status status_usuario not null default 'ATIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_usuarios_status on usuarios (status);

-- Modelo "opt-out": ausência de linha para (usuario_id, pagina) = permitido.
-- ADMINISTRADOR sempre passa, independente do que estiver aqui (checado no
-- backend, não faz sentido gravar linha pra quem já ignora a checagem).
create table permissoes_acesso (
  usuario_id uuid not null references usuarios (id) on delete cascade,
  pagina text not null,
  permitido boolean not null default true,
  primary key (usuario_id, pagina)
);

-- =============================================================================
-- 2. CALENDÁRIO DO ESCRITÓRIO
--    (Agenda, Férias, Feriados, Aniversários derivam de usuarios.aniversario)
-- =============================================================================

create type tipo_evento_agenda as enum ('AUDIENCIA', 'REUNIAO', 'COMPROMISSO', 'EVENTO', 'OUTRO');

create table agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo tipo_evento_agenda not null default 'OUTRO',
  data date not null,
  horario time not null,
  responsavel_id uuid references usuarios (id) on delete set null,
  local text,
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_agenda_eventos_data on agenda_eventos (data);
create index idx_agenda_eventos_responsavel on agenda_eventos (responsavel_id);

-- Anotações livres que o usuário digita na grade de horários da Agenda.
create table agenda_anotacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  data date not null,
  horario time not null,
  texto text not null,
  created_at timestamptz not null default now()
);

create index idx_agenda_anotacoes_usuario_data on agenda_anotacoes (usuario_id, data);

create type status_ferias as enum ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA');

create table ferias (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references usuarios (id) on delete cascade,
  inicio date not null,
  fim date not null,
  status status_ferias not null default 'AGENDADA',
  observacoes text,
  created_at timestamptz not null default now(),
  check (fim >= inicio)
);

create index idx_ferias_funcionario on ferias (funcionario_id);

create type status_atestado as enum ('PENDENTE', 'APROVADO', 'RECUSADO');

-- Atestados médicos: o próprio funcionário registra (data + motivo + arquivo),
-- RH/administrador aprova ou recusa. Arquivo guardado como bytea no próprio
-- Postgres (sem storage externo) — dado sensível (saúde), nunca exposto sem
-- checagem de dono/perfil no backend.
create table atestados (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references usuarios (id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  motivo text,
  arquivo_nome text not null,
  arquivo_tipo text not null,
  arquivo_dados bytea not null,
  status status_atestado not null default 'PENDENTE',
  observacoes_rh text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (data_fim >= data_inicio)
);

create index idx_atestados_funcionario on atestados (funcionario_id);

create type tipo_feriado as enum ('FERIADO', 'RECESSO');

create table feriados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_inicio date not null,
  data_fim date, -- null = feriado de um dia só; preenchido = recesso (ex.: fim de ano)
  tipo tipo_feriado not null default 'FERIADO',
  escritorio_fechado boolean not null default true,
  observacao text
);

-- =============================================================================
-- 3. AUDIÊNCIAS
-- =============================================================================

create type status_audiencia as enum ('AGENDADA', 'REALIZADA', 'CANCELADA', 'REMARCADA');

create table audiencias (
  id uuid primary key default gen_random_uuid(),
  processo text not null,
  cliente text not null,
  advogado_id uuid references usuarios (id) on delete set null,
  data date not null,
  horario time not null,
  tipo text not null,
  local text not null,
  observacoes text,
  status status_audiencia not null default 'AGENDADA',
  created_at timestamptz not null default now()
);

create index idx_audiencias_advogado on audiencias (advogado_id);
create index idx_audiencias_data on audiencias (data);

-- =============================================================================
-- 4. AVISOS (comunicados do escritório)
-- =============================================================================

create type prioridade_aviso as enum ('INFORMATIVO', 'URGENTE', 'ADMINISTRATIVO', 'JURIDICO', 'TECNOLOGIA');

create table avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  autor_id uuid references usuarios (id) on delete set null,
  data date not null default current_date,
  prioridade prioridade_aviso not null default 'INFORMATIVO',
  publico text not null default 'Todos', -- ex.: "Todos", "Jurídico", "Administrativo"
  created_at timestamptz not null default now()
);

-- "lido" no mock é um campo único no aviso, mas isso não escala pra vários
-- usuários lendo o mesmo aviso — aqui vira uma tabela de leitura por pessoa.
create table avisos_leituras (
  aviso_id uuid not null references avisos (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (aviso_id, usuario_id)
);

-- =============================================================================
-- 5. DOCUMENTOS
-- =============================================================================

create type status_documento as enum ('PUBLICADO', 'RASCUNHO');

create table documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null,
  autor_id uuid references usuarios (id) on delete set null,
  data date not null default current_date,
  atualizado_em timestamptz not null default now(),
  tags text[] not null default '{}', -- array nativo do Postgres; evita tabela de junção pra algo simples
  status status_documento not null default 'RASCUNHO',
  tamanho_bytes bigint, -- calculado a partir do arquivo real, não mais texto livre ("2.4 MB")
  arquivo_url text -- caminho no Supabase Storage, se o arquivo for hospedado lá
);

create index idx_documentos_categoria on documentos (categoria);
create index idx_documentos_tags on documentos using gin (tags);

-- =============================================================================
-- 6. BASE DE CONHECIMENTO e MANUAL INTERNO
--    (conteúdo institucional — diferente da base usada pelo RAG do Assistente
--    IA, que continua no ChromaDB por ser busca vetorial, não relacional)
-- =============================================================================

create table base_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null,
  conteudo text not null,
  autor_id uuid references usuarios (id) on delete set null,
  tags text[] not null default '{}',
  status status_documento not null default 'PUBLICADO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_base_conhecimento_categoria on base_conhecimento (categoria);

-- Capítulos do Manual Interno têm ordem fixa de leitura — por isso uma
-- tabela própria em vez de reaproveitar base_conhecimento.
create table manual_interno_capitulos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  ordem int not null unique
);

-- =============================================================================
-- 7. TRIBUNAIS (links úteis)
-- =============================================================================

create table tribunais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null,
  url text not null,
  categoria text not null -- "Estadual", "Federal", "Trabalhista", "Superior", "Sistemas Externos"
);

-- =============================================================================
-- 8. SOLICITAÇÕES (chamados internos)
-- =============================================================================

create type status_solicitacao as enum ('ABERTO', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO');

create table solicitacoes (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, -- ex.: "SOL-0093" — gerar via sequence ou trigger
  solicitante_id uuid not null references usuarios (id) on delete cascade,
  categoria text not null,
  descricao text not null,
  responsavel_id uuid references usuarios (id) on delete set null,
  data date not null default current_date,
  status status_solicitacao not null default 'ABERTO',
  created_at timestamptz not null default now()
);

create index idx_solicitacoes_status on solicitacoes (status);
create index idx_solicitacoes_solicitante on solicitacoes (solicitante_id);

-- =============================================================================
-- 9. NOTIFICAÇÕES
-- =============================================================================

create type tipo_notificacao as enum ('AUDIENCIA', 'FERIAS', 'AVISO', 'ANIVERSARIO', 'DOCUMENTO', 'SOLICITACAO');

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid references usuarios (id) on delete cascade, -- null = notificação geral
  mensagem text not null,
  tipo tipo_notificacao not null,
  data timestamptz not null default now(),
  lida boolean not null default false
);

create index idx_notificacoes_destinatario on notificacoes (destinatario_id, lida);

-- =============================================================================
-- 10. COOPERATIVA DE IDEIAS
-- =============================================================================

create type status_ideia as enum ('NOVA', 'EM_ANALISE', 'APROVADA', 'EM_PRODUCAO', 'PUBLICADA', 'NAO_APROVADA');

create table cooperativa_ideias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  formato text not null, -- "Post", "Reels", "Stories", "Vídeo", "Outro"
  tema text not null,
  referencia text,
  autor_id uuid references usuarios (id) on delete set null,
  data date not null default current_date,
  status status_ideia not null default 'NOVA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cooperativa_ideias_status on cooperativa_ideias (status);

-- =============================================================================
-- 11. ONBOARDING
-- =============================================================================

-- Catálogo fixo dos itens do checklist (hoje hardcoded no frontend).
create table onboarding_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  ordem int not null unique
);

-- Progresso de cada novo funcionário no checklist.
create table onboarding_progresso (
  funcionario_id uuid not null references usuarios (id) on delete cascade,
  item_id uuid not null references onboarding_checklist_itens (id) on delete cascade,
  concluido boolean not null default false,
  concluido_em timestamptz,
  primary key (funcionario_id, item_id)
);

-- =============================================================================
-- 12. MEU AUTHENTICATOR (2FA)
-- =============================================================================
-- ATENÇÃO: segredo_totp é uma credencial sensível de verdade. Não guarde em
-- texto plano num banco acessível. Use pgcrypto (pgp_sym_encrypt) ou, melhor
-- ainda, mantenha isso fora do Postgres (ex.: Supabase Vault / variável de
-- ambiente do backend) e só guarde aqui o nome do serviço e metadados.
create table authenticator_contas (
  id uuid primary key default gen_random_uuid(),
  nome_servico text not null,
  segredo_totp_criptografado bytea not null, -- nunca texto plano
  criado_por uuid references usuarios (id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 13. ROW LEVEL SECURITY
-- =============================================================================
-- O backend conecta como o usuário "postgres" (via DATABASE_URL), que sempre
-- ignora RLS — regra do próprio Postgres para superusuário, então isso não
-- muda nada de como a API funciona. A camada de proteção real do app
-- continua sendo a X-API-Key (backend/security.py).
--
-- Isso existe como segurança em camadas: o Supabase expõe cada tabela
-- automaticamente pela API REST dele (PostgREST), usando uma chave pública
-- ("anon key"). Sem RLS, qualquer um com essa chave leria/escreveria direto
-- nas tabelas, pulando o backend inteiro. Como o projeto nunca usa essa
-- chave em lugar nenhum, o risco hoje é baixo — mas ativar custa uma linha
-- por tabela e fecha essa porta de vez, mesmo se isso mudar no futuro.
alter table usuarios enable row level security;
alter table permissoes_acesso enable row level security;
alter table agenda_eventos enable row level security;
alter table agenda_anotacoes enable row level security;
alter table ferias enable row level security;
alter table atestados enable row level security;
alter table feriados enable row level security;
alter table audiencias enable row level security;
alter table avisos enable row level security;
alter table avisos_leituras enable row level security;
alter table documentos enable row level security;
alter table base_conhecimento enable row level security;
alter table manual_interno_capitulos enable row level security;
alter table tribunais enable row level security;
alter table solicitacoes enable row level security;
alter table notificacoes enable row level security;
alter table cooperativa_ideias enable row level security;
alter table onboarding_checklist_itens enable row level security;
alter table onboarding_progresso enable row level security;
alter table authenticator_contas enable row level security;

-- =============================================================================
-- Fim do schema principal.
--
-- Fora daqui, de propósito:
--   - Base vetorial do Assistente IA (RAG): continua no ChromaDB
--     (backend/chroma_data/), não faz sentido em tabela relacional.
--   - Respostas mockadas da aba "Comunicação" do Assistente IA
--     (aiKnowledge.ts / communicationKnowledge.ts): é conteúdo estático do
--     app, não dado de usuário — não precisa virar tabela.
--   - Autenticação de sessão (login): se for usar Supabase Auth em vez de
--     senha_hash própria, a tabela `usuarios` pode referenciar
--     auth.users(id) do Supabase em vez de ter senha_hash — mais simples e
--     mais seguro que reinventar hashing de senha.
-- =============================================================================
