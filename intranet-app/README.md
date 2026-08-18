# Intranet Eraldo Júnior Advocacia — frontend

Aplicação React + TypeScript (Vite) da intranet. Ver `../README.md` na raiz
do repositório para visão geral do projeto inteiro, e
`../docs/DOCUMENTACAO.docx` para a documentação técnica completa.

## Rodando localmente

```bash
npm install
npm run dev        # servidor de desenvolvimento, http://localhost:5173
# ou
npm run build       # gera dist/ para produção
```

Para testar o build de produção como site estático:

```bash
npm run build
cd dist && python3 -m http.server 8091
# abrir http://localhost:8091/
```

## Backend

Meu Authenticator e o Assistente IA precisam do backend Python rodando (ver
`../backend/README.md`). Configure `intranet-app/.env` (copie de
`.env.example`) apontando pra ele.

## Stack

- React 19 + TypeScript, build com Vite
- Tailwind CSS v4 (tema em `src/index.css`, bloco `@theme`)
- React Router (`HashRouter`, funciona em qualquer hospedagem estática)
- `motion` para transições e micro-interações; listas/grids usam CSS puro
  (`.stagger-fade` em `src/index.css`) por ser mais leve que animar item a
  item via JS
- Páginas secundárias carregadas sob demanda via `React.lazy`
