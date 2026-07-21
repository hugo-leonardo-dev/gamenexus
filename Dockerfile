# ============================================================================
# Dockerfile — GameNexus (Next.js 16)
# ============================================================================
# Estágios:
#   1. deps     → Instala dependências completas (incluindo dev)
#   2. builder  → Builda o Next.js com standalone output
#   3. runner   → Copia apenas o necessário para produção (~200MB)
#
# Uso:
#   docker build --build-arg DOCKER_BUILD=true -t gamenexus .
#   docker run -p 3000:3000 gamenexus
#
# Orquestração com docker-compose (recomendado):
#   docker compose up -d
# ============================================================================

# ─── Stage 1: Dependências ───────────────────────────────────────────────
FROM node:22-alpine AS deps

# Utilitários necessários para algumas dependências nativas
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copia apenas os arquivos de dependência (aproveita cache do Docker)
COPY package.json package-lock.json ./

# Instala TODAS as dependências (incluindo devDependencies)
# O Next.js precisa de TypeScript, Tailwind, PostCSS, etc. para compilar
RUN npm ci

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copia node_modules do estágio deps
COPY --from=deps /app/node_modules ./node_modules

# Copia todo o código fonte
COPY . .

# Flag para habilitar standalone output no next.config.ts
ENV DOCKER_BUILD=true

# Gera o Prisma Client (precisa do schema presente em prisma/schema.prisma)
# O postinstall no stage deps falhou porque o schema não estava disponível
RUN npx prisma generate

# Build do Next.js
RUN npm run build

# ─── Stage 3: Runner (Produção) ──────────────────────────────────────────
FROM node:22-alpine AS runner

# Utilitários de sistema (opcional para healthcheck)
RUN apk add --no-cache curl

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copia o output standalone do Next.js
# (contém server.js + package.json de produção + node_modules)
COPY --from=builder /app/.next/standalone ./

# Copia os assets estáticos (necessários separadamente no standalone)
COPY --from=builder /app/.next/static ./.next/static

# Copia arquivos públicos
COPY --from=builder /app/public ./public

# Define dono dos arquivos como usuário não-root
RUN chown -R nextjs:nodejs /app

# Usa usuário não-root
USER nextjs

# Expõe a porta do Next.js
EXPOSE 3000

# Define a variável de ambiente para o servidor
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck (requer curl instalado)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Inicia o servidor standalone do Next.js
# O server.js gerado pelo Next.js já lê as env vars do processo
CMD ["node", "server.js"]

# ─── Stage 4: Migrate (Prisma) ────────────────────────────────────────────
# Imagem leve apenas para executar prisma migrate deploy.
# Usa node_modules do builder (que tem todas as deps) + schema/migrations.
FROM node:22-alpine AS migrate

RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copia node_modules completos (inclui Prisma CLI)
COPY --from=builder /app/node_modules ./node_modules

# Copia apenas o necessário para as migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./

# Healthcheck via pg_isready (cliente postgresql)
HEALTHCHECK --interval=5s --timeout=5s --retries=10 --start-period=5s \
  CMD pg_isready -h postgres -U gamenexus -d gamenexus || exit 1

CMD ["npx", "prisma", "migrate", "deploy"]
