# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Etapa 1: build
# Instala TODAS as dependências (inclusive o Prisma CLI), gera o Prisma Client
# e compila a aplicação.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Copiar só os manifestos primeiro aproveita o cache do Docker:
# as dependências só são reinstaladas quando o package-lock.json muda.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Etapa 2: migrator
# Imagem usada SOMENTE para aplicar migrations (e o seed opcional).
# Reaproveita a etapa de build, que já tem o Prisma CLI, o schema,
# as migrations e o client gerado.
# ---------------------------------------------------------------------------
FROM build AS migrator
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
USER node
# "migrate deploy" só aplica as migrations pendentes de prisma/migrations.
# Ele nunca apaga dados, nunca reseta o banco e nunca cria migrations novas.
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# Etapa 3: runtime (imagem final da aplicação)
# Só dependências de produção + código compilado.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Pasta de logs: montada como volume pelo docker compose.
RUN mkdir -p /app/logs && chown node:node /app/logs
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
