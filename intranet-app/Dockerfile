# Build de produção do frontend, servido por Caddy (HTTPS automático via
# Let's Encrypt + proxy reverso pra /api/* apontando pro container do
# backend — ver Caddyfile). As duas variáveis VITE_* são "baked" no bundle
# em tempo de build (padrão do Vite) — não dá pra trocar depois sem
# rebuildar a imagem.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_AUTHENTICATOR_API_URL=""
ARG VITE_AUTHENTICATOR_API_KEY
ENV VITE_AUTHENTICATOR_API_URL=$VITE_AUTHENTICATOR_API_URL
ENV VITE_AUTHENTICATOR_API_KEY=$VITE_AUTHENTICATOR_API_KEY

RUN npm run build

FROM caddy:2-alpine

COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
