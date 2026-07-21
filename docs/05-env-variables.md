# 🔧 Auditoria de Variáveis de Ambiente — GameNexus

> **Documento:** `docs/05-env-variables.md`
> **Status:** Completo — `.env.example` criado
> **Data:** Julho 2026

---

## Sumário

1. [Mapa Completo de Variáveis](#1-mapa-completo-de-variáveis)
2. [Análise de Segurança](#2-análise-de-segurança)
3. [Mudanças Dev → Produção](#3-mudanças-dev--produção)
4. [Valores Inseguros](#4-valores-inseguros)
5. [Benchmarking](#5-benchmarking)
6. [Arquivo `.env.example`](#6-arquivo-envexample)

---

## 1. Mapa Completo de Variáveis

### 1.1 Todas as Variáveis

| # | Variável | Obrigatória | Segredo | Usada em | Finalidade |
|---|----------|-------------|---------|----------|------------|
| 1 | `DATABASE_URL` | ✅ Sim | ✅ Sim | `prisma.ts:10` | Conexão PostgreSQL |
| 2 | `AUTH_SECRET` | ✅ Sim | ✅ Sim | `auth.ts:10` | Encriptar JWT |
| 3 | `AUTH_DISCORD_ID` | ✅ Sim | ✅ Sim | `auth.ts:13` | Client ID Discord OAuth |
| 4 | `AUTH_DISCORD_SECRET` | ✅ Sim | ✅ Sim | `auth.ts:14` | Client Secret Discord OAuth |
| 5 | `NODE_ENV` | ✅ Sim | ❌ Não | `prisma.ts:17,26`, `api-utils.ts:130` | Ambiente (dev/prod/test) |
| 6 | `CRON_SECRET` | ⚠️ (cron) | ✅ Sim | `cron/update-prices/route.ts:7` | Autenticar cron job |
| 7 | `NEXTAUTH_URL` | ✅ Sim | ❌ Não | `docker-compose.yml` | URL base para OAuth callbacks |
| 8 | `NEXTAUTH_SECRET` | ✅ Sim | ✅ Sim | `docker-compose.yml` | Segundo secret NextAuth |
| 9 | `POSTGRES_PASSWORD` | ⚠️ (Docker) | ✅ Sim | `docker-compose.yml` | Senha do container PostgreSQL |
| 10 | `DOCKER_BUILD` | ❌ Opcional | ❌ Não | `next.config.ts:8` | Ativa standalone output para Docker |
| 11 | `REDIS_URL` | ❌ Opcional | ❌ Não | `docker-compose.yml` | URL do Redis (cache) |
| 12 | `HOSTNAME` | ❌ Opcional | ❌ Não | `docker-compose.yml` | Host bind (0.0.0.0 para Docker) |
| 13 | `PORT` | ❌ Opcional | ❌ Não | `docker-compose.yml` | Porta do servidor (3000) |

### 1.2 Classificação por Categoria

#### Database
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
POSTGRES_PASSWORD=senha_do_container
```

#### Autenticação
```env
AUTH_SECRET=openssl_rand_hex_32
AUTH_DISCORD_ID=client_id
AUTH_DISCORD_SECRET=client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=mesmo_do_AUTH_SECRET
```

#### Cron
```env
CRON_SECRET=openssl_rand_hex_32
```

#### Infraestrutura
```env
NODE_ENV=development
DOCKER_BUILD=true
REDIS_URL=redis://redis:6379
HOSTNAME=0.0.0.0
PORT=3000
```

---

## 2. Análise de Segurança

### 2.1 Risco por Variável

| Variável | Risco se vazar | Risco se faltar |
|----------|----------------|-----------------|
| `DATABASE_URL` | 🔴 Acesso total ao banco | 🔴 App não inicia |
| `AUTH_SECRET` | 🔴 JWT pode ser forjado | 🔴 App não inicia |
| `AUTH_DISCORD_ID` | 🟡 Spam de login | 🟡 Discord OAuth quebra |
| `AUTH_DISCORD_SECRET` | 🔴 Login Discord pode ser sequestrado | 🟡 Discord OAuth quebra |
| `CRON_SECRET` | 🟡 Cron pode ser acionado externamente | 🟡 Cron não funciona |
| `POSTGRES_PASSWORD` | 🔴 Acesso ao banco (Docker) | 🟡 Docker não inicia |

### 2.2 Non-null Assertions Problemáticas

```ts
// src/lib/auth.ts — NON-NULL ASSERTIONS
clientId: process.env.AUTH_DISCORD_ID!,     // ⚠️ Se faltar, erro runtime
clientSecret: process.env.AUTH_DISCORD_SECRET!, // ⚠️ Se faltar, erro runtime

// src/lib/prisma.ts — ANTES (corrigido)
const connectionString = process.env.DATABASE_URL!;  // Era non-null

// src/lib/prisma.ts — DEPOIS (corrigido ✅)
if (!connectionString) throw new Error("DATABASE_URL é obrigatória");
```

### 2.3 Valores Padrão Seguros

| Variável | Padrão | Risco |
|----------|--------|-------|
| `NODE_ENV` | `development` | 🟡 Em produção, precisa ser `production` |
| `REDIS_URL` | `redis://redis:6379` | ✅ Internal Docker |
| `HOSTNAME` | `0.0.0.0` | ✅ Docker only |
| `PORT` | `3000` | ✅ Padrão Next.js |

---

## 3. Mudanças Dev → Produção

| Variável | Desenvolvimento | Produção (Oracle) | Onde alterar |
|----------|----------------|-------------------|--------------|
| `DATABASE_URL` | `@localhost:5432` | `@postgres:5432` (Docker) | `.env` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://gamenexus.com` | `.env` |
| `AUTH_SECRET` | Valor local | **Gerar novo** | `.env` |
| `NODE_ENV` | `development` | `production` | `.env` |
| `DOCKER_BUILD` | não definido | `true` | `.env` |
| `CRON_SECRET` | Valor local | **Gerar novo** | `.env` |

---

## 4. Valores Inseguros

### 🔴 Crítico

| Item | Problema | Solução |
|------|----------|---------|
| `.env` versionado | ⚠️ Verificar se `.env` está no `.gitignore` | Já deve estar — confirmar |
| `AUTH_DISCORD_ID!` | Non-null assertion sem fallback | Adicionar validação |

### 🟡 Atenção

| Item | Problema | Solução |
|------|----------|---------|
| `NEXTAUTH_SECRET` = `AUTH_SECRET` | Redundante, mas funcional | Manter ou remover do compose |
| `POSTGRES_PASSWORD` no compose | Passada como env var | Docker internal network, seguro |

---

## 5. Arquivo `.env.example`

O arquivo `.env.example` na raiz do projeto contém todas as variáveis documentadas:

```env
# ============================================================================
# GameNexus - Variáveis de Ambiente
# ============================================================================
# Copie como .env e preencha os valores.
#
#   cp .env.example .env
#
# LEGENDA:
#   (required)    Obrigatoria - App nao funciona sem ela
#   (optional)    Opcional - fallback padrao seguro
#   (secret)      Mantenha em segredo - nao versionar!
# ============================================================================

# --- PostgreSQL ---------------------------------------------------------
# (required) (secret) URL de conexao do PostgreSQL.
DATABASE_URL=postgresql://gamenexus:SUA_SENHA_AQUI@postgres:5432/gamenexus

# (required for Docker) (secret) Senha do PostgreSQL para o container.
POSTGRES_PASSWORD=SUA_SENHA_AQUI

# --- NextAuth (Autenticacao) ---------------------------------------------
# (required) (secret) Chave para encriptar tokens JWT.
AUTH_SECRET=openssl_rand_hex_32_aqui

# (required for Discord) (secret) Client ID do app Discord OAuth.
AUTH_DISCORD_ID=seu_discord_client_id

# (required for Discord) (secret) Client Secret do app Discord OAuth.
AUTH_DISCORD_SECRET=seu_discord_client_secret

# (required) URL base da aplicacao para callbacks OAuth.
NEXTAUTH_URL=http://localhost:3000

# (required) (secret) Segundo secret para NextAuth.
NEXTAUTH_SECRET=mesmo_valor_do_AUTH_SECRET

# --- Cron Job ------------------------------------------------------------
# (required for cron) (secret) Token para autenticar o cron de precos.
CRON_SECRET=openssl_rand_hex_32_aqui

# --- Docker Build --------------------------------------------------------
# (optional) Ativa standalone output do Next.js para Docker.
DOCKER_BUILD=true

# --- Redis ---------------------------------------------------------------
# (optional) URL do Redis. Sem ela, usa cache em memoria.
REDIS_URL=redis://redis:6379

# --- Runtime -------------------------------------------------------------
# (optional) Ambiente: development | production | test
NODE_ENV=development

# (optional) Porta do servidor Next.js (default: 3000)
PORT=3000
```

---

## 6. Checklist de Configuração

### Antes do Deploy

- [ ] **Gerar `AUTH_SECRET`** — `openssl rand -hex 32` (NÃO reusar o do dev)
- [ ] **Gerar `CRON_SECRET`** — `openssl rand -hex 32`
- [ ] **Gerar `POSTGRES_PASSWORD`** — Senha forte para o banco
- [ ] **Configurar `NEXTAUTH_URL`** — URL real de produção
- [ ] **Configurar `NODE_ENV=production`**
- [ ] **Verificar `.gitignore`** — `.env` não pode ser versionado

### Após o Deploy

- [ ] Verificar logs do app para confirmar env vars
- [ ] Testar login Discord (confirma `NEXTAUTH_URL` correta)
- [ ] Testar cron job manualmente
- [ ] Rotacionar secrets se houver suspeita de vazamento

---

## Referências

- [NextAuth.js Environment Variables](https://authjs.dev/reference/nextjs#environment-variables)
- [Prisma Connection Docs](https://www.prisma.io/docs/orm/reference/connection-urls)
- [12 Factor App - Config](https://12factor.net/config)

---

*Documento gerado via auditoria de código-fonte em Julho de 2026.*
