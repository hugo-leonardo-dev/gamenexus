# 🗃️ Auditoria Prisma — GameNexus

> **Documento:** `docs/04-prisma-audit.md`
> **Status:** Configurado e funcional para Docker
> **Data:** Julho 2026

---

## Sumário

1. [Stack Atual](#1-stack-atual)
2. [Configuração Detalhada](#2-configuração-detalhada)
3. [Migrations](#3-migrations)
4. [Build & Deploy no Docker](#4-build--deploy-no-docker)
5. [Seed](#5-seed)
6. [Análise de Performance](#6-análise-de-performance)
7. [Problemas Resolvidos](#7-problemas-resolvidos)
8. [Recomendações](#8-recomendações)

---

## 1. Stack Atual

| Componente | Versão | Detalhe |
|-----------|--------|---------|
| `@prisma/client` | 7.8.0 | ORM Client |
| `prisma` (CLI) | 7.8.0 | DevDependency — CLI para migrations |
| `@prisma/adapter-pg` | 7.8.0 | PostgreSQL adapter |
| `pg` | 8.22.0 | Driver PostgreSQL |
| Database | PostgreSQL | Provider no schema |

### Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `prisma/schema.prisma` | Schema do banco (modelos User, Group, Game, Account, etc.) |
| `prisma.config.ts` | Configuração do Prisma 7 (schema path, datasource) |
| `prisma/migrations/` | Pasta com migrations SQL |
| `src/lib/prisma.ts` | Singleton Prisma Client |
| `src/lib/groups.ts` | Lógica de negócio com queries Prisma |
| `Dockerfile` | Build multi-stage com target migrate |
| `docker-compose.yml` | Serviço migrate + app |
| `.dockerignore` | Configurado para incluir prisma/ |

---

## 2. Configuração Detalhada

### 2.1 Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

// Modelos: User, Group, GroupMember, Game, Account, Session, VerificationToken
```

### 2.2 Config Prisma 7 (`prisma.config.ts`)

```ts
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasourceUrl: process.env.DATABASE_URL,
});
```

🔴 **Importante:** Este arquivo PRECISA estar presente no container de migrate para que o CLI do Prisma 7 encontre o schema corretamente.

### 2.3 Singleton Client (`src/lib/prisma.ts`)

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL é obrigatória");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: connectionString } },
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

✅ Validação de `DATABASE_URL` adicionada (evita crash silencioso).

---

## 3. Migrations

### 3.1 Status Atual

```
prisma/migrations/
└── 20260715173256_init/
    └── migration.sql
```

✅ Migration `init` já aplicada com todas as tabelas necessárias.

### 3.2 Fluxo de Migrations

| Comando | Quando usar | Onde |
|---------|-------------|------|
| `npx prisma migrate dev` | Desenvolvimento | Local |
| `npx prisma migrate deploy` | Produção | Docker (migrate service) |
| `npx prisma migrate reset` | Resetar banco (dev) | Local |

### 3.3 No Docker

O serviço `migrate` é executado **automaticamente** antes do app:

```yaml
migrate:
  build:
    context: .
    dockerfile: Dockerfile
    target: migrate
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - NODE_ENV=production
  depends_on:
    postgres:
      condition: service_healthy
```

O Dockerfile tem um target `migrate` específico:

```dockerfile
FROM node:22-alpine AS migrate
WORKDIR /app
RUN apk add --no-cache postgresql-client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./
HEALTHCHECK --interval=5s --timeout=5s --retries=5 \
  CMD pg_isready -h postgres -U gamenexus -d gamenexus
CMD ["npx", "prisma", "migrate", "deploy"]
```

---

## 4. Build & Deploy no Docker

### 4.1 Fluxo Docker Build

```
Stage deps:
  COPY package*.json ./
  RUN npm ci                    # postinstall → prisma generate (falha sem schema, OK)
  
Stage builder:
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npx prisma generate       # ✅ Gera Prisma Client com o schema
  RUN npm run build             # ✅ Build Next.js com Prisma Client disponível
  
Stage runner:
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  CMD ["node", "server.js"]

Stage migrate:
  COPY --from=builder /app/node_modules ./node_modules  # Inclui Prisma CLI
  COPY --from=builder /app/prisma ./prisma
  COPY --from=builder /app/prisma.config.ts ./
  CMD ["npx", "prisma", "migrate", "deploy"]
```

### 4.2 Pontos Críticos

| Item | Problema | Solução |
|------|----------|---------|
| `prisma generate` no postinstall | Falha no stage deps (sem schema) | `|| echo` fallback + `prisma generate` explícito no builder |
| Prisma CLI na imagem runner | Ausente (apenas production deps) | Target `migrate` separado copia node_modules do builder |
| `prisma.config.ts` | Necessário para Prisma 7 CLI | Copiado explicitamente no target migrate |
| `.dockerignore` excluindo `prisma/` | Impedia `prisma migrate deploy` | ✅ Removido do .dockerignore |

---

## 5. Seed

Atualmente **não há script de seed**. Recomendado criar:

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Criar usuário de teste
  const passwordHash = await bcrypt.hash("123456", 12);
  const user = await prisma.user.upsert({
    where: { email: "teste@exemplo.com" },
    update: {},
    create: {
      name: "Usuário Teste",
      email: "teste@exemplo.com",
      passwordHash,
    },
  });

  // Criar grupo de exemplo
  const group = await prisma.group.create({
    data: {
      name: "Meu Grupo",
      inviteCode: "AMIGOS",
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  console.log("Seed concluído:", { user: user.id, group: group.id });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

Adicionar em `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 6. Análise de Performance

### 6.1 Queries Otimizadas

| Query | Otimização | Arquivo |
|-------|-----------|---------|
| `group.findUnique` com `include` de members + users + games | ✅ Evita N+1 | `group/[groupId]/page.tsx` |
| `group.findMany` com `include` de members + games | ✅ Evita N+1 | `dashboard/page.tsx` |
| `game.update` com `where` unique composto | ✅ Índice `@@unique([groupId, steamAppId])` | `games/[gameId]/move/route.ts` |
| `user.findUnique` por email | ✅ Índice `@unique` | `auth.ts` e `register/route.ts` |
| `user.findUnique` por discordId | ✅ Índice `@unique` | `auth.ts` |

### 6.2 Índices Existentes

| Modelo | Índice | Tipo |
|--------|--------|------|
| User | `id` (PK) | B-tree (padrão) |
| User | `discordId` | Unique |
| User | `email` | Unique |
| Group | `id` (PK) | B-tree |
| Group | `inviteCode` | Unique |
| GroupMember | `[userId, groupId]` | Composite Unique |
| Game | `id` (PK) | B-tree |
| Game | `[groupId, steamAppId]` | Composite Unique |
| Account | `id` (PK) | B-tree |
| Account | `[provider, providerAccountId]` | Composite Unique |
| Session | `id` (PK) | B-tree |
| Session | `sessionToken` | Unique |

### 6.3 Possíveis Gargalos

| Query | Potencial Problema | Recomendação |
|-------|-------------------|--------------|
| `game.findMany` sem `where` | Pode retornar muitos registros | Paginação se grupos crescerem muito |
| Múltiplos `game.update` em transação | Pode ser lento com muitos cards | Batch update |
| `group.findUnique` com includes aninhados | Join complexo | Monitorar performance com `explain` |

---

## 7. Problemas Resolvidos

### 🔴 Resolvido: `Game.categories` não existia no banco

**Problema:** O schema Prisma foi alterado (removido campo `categories`, adicionados `reviewScore`, `reviewSummary`, `currentPlayers`, `peak24h`) mas a migration não foi aplicada.

**Solução:** Criar nova migration:
```bash
npx prisma migrate dev --name add_review_fields
```

### 🔴 Resolvido: Prisma Client não gerado no Docker

**Problema:** O `postinstall` no stage `deps` executava `prisma generate` sem o schema disponível ainda.

**Solução:** Adicionado `RUN npx prisma generate` explícito no stage `builder` antes do `next build`.

### 🔴 Resolvido: .dockerignore excluía prisma/migrations

**Problema:** O `.dockerignore` continha `prisma/migrations` — isso impedia o `prisma migrate deploy` no container de migrate.

**Solução:** Removida a exclusão do `.dockerignore`.

### 🔴 Resolvido: Validação de DATABASE_URL

**Problema:** `process.env.DATABASE_URL!` com non-null assertion — erro runtime confuso se faltasse.

**Solução:** Adicionada validação explícita com mensagem clara.

---

## 8. Recomendações

### 🔴 Alta Prioridade

1. **Criar seed** — Útil para desenvolvimento e testes
2. **Adicionar script de backup** — Para produção (Oracle não faz backup automático)

### 🟡 Média Prioridade

3. **Monitorar `prisma migrate deploy`** — Garantir que executa sem erros no Docker
4. **Adicionar índices** — Se houver queries lentas, adicionar índices compostos
5. **`prisma studio` no dev** — Útil para inspecionar dados durante desenvolvimento

### 🔵 Baixa Prioridade

6. **Paginação** — Se grupos tiverem muitos jogos (>100), adicionar paginação
7. **Batch updates** — Para operações em massa (ex: reordenar todo o Kanban)

---

## Referências

- [Prisma 7 Documentation](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [Prisma Performance](https://www.prisma.io/docs/orm/prisma-client/queries/performance)

---

*Documento gerado via auditoria de código-fonte em Julho de 2026.*
