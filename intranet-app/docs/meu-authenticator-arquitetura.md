# Meu Authenticator — arquitetura (não implementado)

Status: **planejamento apenas**. Nada deste documento está implementado no
frontend. Não implementar nenhuma parte disso sem antes ter o backend real
descrito abaixo — nunca simular geração de código TOTP no navegador como se
fosse real.

## Decisão confirmada

- Fluxo de MFA usado pelo escritório: **TOTP/OATH (código de 6 dígitos)**, não
  push de aprovação. Isso habilita a arquitetura abaixo.
- Se algum sistema do escritório usar push (Aprovar/Negar), esse fluxo **não
  entra** nesta funcionalidade — mantém o app oficial da Microsoft.

## Restrição técnica que define o que é possível

O segredo (seed) de um token TOTP é **write-once**: só existe no momento do
registro do autenticador e nunca é retornável depois — nem pelo Microsoft
Graph, nem por nenhum backend, nem com qualquer nível de permissão. Isso é
proposital (é a base da segurança do TOTP), não uma limitação de API.

Consequência prática:

| Cenário | Viável? |
|---|---|
| "Espelhar" no site o código que já está no Microsoft Authenticator pessoal de cada funcionário (MFA da conta Microsoft 365/Entra dele) | **Não.** O segredo já foi gerado no momento em que a pessoa escaneou o QR code no celular dela; ninguém mais tem acesso a ele, nem a própria Microsoft por API. |
| Backend do escritório gera e guarda o segredo TOTP de uma **conta de serviço/compartilhada** (ex: login único de um tribunal, um e-mail compartilhado, um sistema interno) no momento em que a TI cadastra o 2FA dessa conta | **Sim.** Quem gerou o segredo pode gerar os códigos atuais a qualquer momento, porque o segredo nunca saiu do backend. |

Ou seja: "Meu Authenticator" só pode existir para **contas de serviço que o
próprio escritório cadastra do zero através do backend**, não como substituto
do MFA pessoal de cada um no Microsoft 365.

## Arquitetura proposta

```
Frontend (página "Meu Authenticator")
        │  HTTPS, sessão autenticada (JWT/cookie httpOnly)
        ▼
Backend / API (Node.js)
        │  autorização por usuário × serviço (RBAC)
        ▼
Serviço de TOTP
        │  lê o segredo só em memória no servidor, nunca sai dele
        ▼
Cofre de segredos (não o banco de app comum)
   → Azure Key Vault, HashiCorp Vault, ou no mínimo uma coluna
     criptografada com KMS — nunca texto plano, nunca no mesmo banco
     que dados de negócio comuns.
```

### Fluxo de leitura de um código

1. Frontend pede `GET /api/authenticator/codes` com sessão válida.
2. Backend verifica: usuário autenticado? Usuário autorizado para os serviços
   que está pedindo? (tabela `user_service_authorization`).
3. Backend calcula o TOTP atual (`otplib` ou `speakeasy`) usando o segredo
   lido do cofre — o segredo nunca é serializado na resposta.
4. Resposta contém **só**: nome do serviço, código atual (6 dígitos), sistema
   (`period_seconds_remaining`), timestamp. Nunca o seed.
5. Toda leitura de código gera um registro de auditoria (`quem`, `quando`,
   `qual serviço`) — ver seção de segurança.
6. Frontend re-consulta a cada ciclo (ex: a cada 30s, sincronizado com o
   `period_seconds_remaining` retornado) — não gera o próximo código sozinho.

### Modelo de dados (rascunho)

```
services            (id, nome, icone, ativo)
service_secrets     (service_id, secret_encrypted, criado_por, criado_em)
user_service_access (user_id, service_id, concedido_por, concedido_em)
authenticator_audit_log (user_id, service_id, acao, ip, timestamp)
```

`service_secrets.secret_encrypted` nunca é lido pelo backend de aplicação
diretamente — só pelo serviço de TOTP, que roda com acesso mínimo ao cofre.

## Segurança — checklist para quando for implementar

- [ ] Segredo TOTP só existe no cofre de segredos, nunca no banco de app, nunca em log, nunca em variável de ambiente do frontend.
- [ ] Frontend nunca recebe o seed — só o código de 6 dígitos já calculado.
- [ ] Nada de TOTP em `localStorage`/`sessionStorage` além do código corrente exibido na tela (que expira em segundos de qualquer forma).
- [ ] HTTPS obrigatório, sessão com expiração curta.
- [ ] RBAC: usuário só vê os serviços que foi explicitamente autorizado a acessar.
- [ ] Log de auditoria em toda visualização/cópia de código — isso é, na prática, acesso a uma credencial viva.
- [ ] Rate limiting no endpoint de código (evita scraping).
- [ ] Cadastro de um novo segredo (`service_secrets`) é ação exclusiva de admin, com confirmação e log.

## Frontend (para quando o backend existir)

Página **Meu Authenticator**, descrição: "Acesse rapidamente seus códigos de
autenticação autorizados." Card por serviço: nome, ícone, código de 6
dígitos, contador regressivo, botão "Copiar" com feedback animado, horário da
última atualização. Skeleton loading ao carregar. Segue o mesmo padrão visual
e de animação (`motion`, `useReducedMotion`) já usado no resto do sistema —
ver `src/components/Card.tsx`, `src/hooks/useReducedMotion.ts`.

## Pré-requisitos antes de codar isso

1. Backend real (hoje o projeto é 100% frontend com dados mockados).
2. Decisão de qual cofre de segredos usar.
3. Lista de quais contas de serviço/compartilhadas entram nessa primeira versão (não é pra MFA pessoal de ninguém).
4. Quem pode cadastrar novos segredos (só admin de TI, provavelmente).
