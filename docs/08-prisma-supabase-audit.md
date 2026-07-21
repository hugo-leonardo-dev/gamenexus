# Auditoria: Integração Prisma + Next.js + Supabase

> **Data:** 21/07/2026
> **Versão do Projeto:** 0.1.0
> **Objetivo:** Revisão completa da arquitetura Prisma + Next.js + Supabase seguindo as melhores práticas atuais.

---

## 1. Versões Instaladas

| Pacote | Versão | Status |
|--------|--------|--------|
| `prisma` (CLI) | `^7.8.0` | ✅ Atual |
| `@prisma/client` | `^7.8.0` | ✅ Atual |
| `@prisma/adapter-pg` | `^7.8.0` | ⚠️ Não utilizado (removido do código) |
| `pg` | `^8.22.0` | ⚠️ Não utilizado (removido do código) |
| `next` | `16.2.10` | ✅ Atual |
| `next-auth` | `^5.0.0-beta.31` | ✅ Atual |
| `@auth/prisma-adapter` | `^2.11.2` | ⚠️ Instalado mas nunca usado |
| `Node.js` | `v24.15.0` | ✅ Atual |
| `@types/pg` | `^8.20.0` | ⚠️ Só necessário se `pg` for usado |

---

## 2. Arquitetura Atual

```
src/lib/prisma.ts         → PrismaClient padrão (sem adapter)
prisma/schema.prisma      → datasource com provider + url
prisma.config.ts          → Config Prisma 7 (gerado automaticamente)
.env                      → DATABASE_URL + DIRECT_URL
```

### Fluxo de Conexão

```
Next.js App
    ↓
src/lib/prisma.ts (PrismaClient)
    ↓
env("DATABASE_URL") no schema.prisma
    ↓
lê da variável de ambiente DATABASE_URL
    ↓
Conecta ao Supabase (porta 5432 com sslmode=require)
```

---

## 3. Problemas Encontrados

### 🔴 Problema 1: Mistura de padrões Prisma 5 + Prisma 6/7

O projeto possui **duas fontes de verdade** para a URL do banco:

**`prisma.config.ts`** (padrão Prisma 6/7):
```typescript
export default defineConfig({
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

**`prisma/schema.prisma`** (padrão Prisma 5):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ← redundante
}
```

**Problema:** O `prisma.config.ts` é a configuração moderna do Prisma 6+ e já fornece a URL. Ter `url` no `schema.prisma` é redundante. Embora não cause erro (Prisma 7 é compatível com ambos), cria confusão sobre qual é a fonte oficial.

**Solução:** Remover `url = env("DATABASE_URL")` do `schema.prisma`, mantendo apenas o `prisma.config.ts` como fonte.

---

### 🔴 Problema 2: `prisma.config.ts` sem `directUrl`

O `prisma.config.ts` só define `url`, mas migrations (`prisma migrate deploy`) precisam de conexão **direta** ao PostgreSQL (não passando pelo pooler).

```typescript
datasource: {
  url: process.env["DATABASE_URL"],       // Runtime (porta 5432 com SSL)
  // directUrl: process.env["DIRECT_URL"], // ← FALTANDO
}
```

**Solução:** Adicionar `directUrl: process.env["DIRECT_URL"]` no `prisma.config.ts`.

---

### 🔴 Problema 3: Dependências não utilizadas

| Dependência | Tamanho | Motivo da Remoção |
|------------|---------|-------------------|
| `@prisma/adapter-pg@^7.8.0` | ~5MB | Foi removido do `prisma.ts`. Só usado com Pool customizado. |
| `pg@^8.22.0` | ~2MB | Era dependência do adapter. Sem adapter, sem uso. |
| `@types/pg@^8.20.0` | ~50KB | DevDep do `pg`. Sem `pg`, sem necessidade. |
| `@auth/prisma-adapter@^2.11.2` | ~20KB | O `auth.ts` NÃO usa o adapter — gerencia usuários manualmente via `signIn` callback. |

**Solução:** Remover do `package.json` com `npm uninstall`.

---

### 🟡 Problema 4: Variável não utilizada em `prisma.ts`

```typescript
function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;  // ← atribuída mas não usada
  if (!databaseUrl) {
    throw new Error("...");
  }
  return new PrismaClient({
    // databaseUrl não é passado aqui
  });
}
```

A validação manual não é necessária porque o `PrismaClient` já valida a URL internamente.

**Solução:** Remover a variável e simplificar a função.

---

### 🟡 Problema 5: `postinstall` engole erros

```json
"postinstall": "prisma generate || echo '[prisma] Aviso: prisma generate falhou'"
```

Se `prisma generate` falha, o erro é silenciado e o build continua sem Prisma Client. Isso pode causar erros misteriosos em runtime.

**Solução:** Remover o `|| echo` e deixar o erro falhar o build (fail fast).

---

### 🟡 Problema 6: Debug em produção

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,  // ← Loga informações sensíveis em produção
```

Loga tokens JWT, perfis dos usuários, etc. nos logs da Vercel.

**Solução:** Tornar condicional: `debug: process.env.NODE_ENV !== "production"`.

---

## 4. Arquitetura Recomendada

### Opção Escolhida: **Prisma 7 com `prisma.config.ts` + PrismaClient padrão**

```
prisma.config.ts          → Fonte ÚNICA da URL (url + directUrl)
prisma/schema.prisma      → Apenas provider (sem url)
src/lib/prisma.ts         → PrismaClient padrão (sem adapter)
.env                      → DATABASE_URL + DIRECT_URL
```

### Motivos

| Critério | Nota | Justificativa |
|----------|------|---------------|
| Estabilidade | ✅ | PrismaClient padrão é a configuração mais testada |
| Vercel | ✅ | Compatível com serverless (cold starts, conexões) |
| Supabase | ✅ | Funciona com conexão direta + `sslmode=require` |
| Manutenção | ✅ | Menos código, uma única fonte de verdade |
| Migrations | ✅ | `prisma.config.ts` com `directUrl` para `prisma migrate deploy` |

---

## 5. Correções Propostas

### Correção 1: `prisma/schema.prisma`

```diff
 datasource db {
   provider = "postgresql"
-  url      = env("DATABASE_URL")
 }
```

### Correção 2: `prisma.config.ts`

```diff
 export default defineConfig({
   schema: "prisma/schema.prisma",
   datasource: {
     url: process.env["DATABASE_URL"],
+    directUrl: process.env["DIRECT_URL"],
   },
   migrations: {
     path: "prisma/migrations",
   },
 });
```

### Correção 3: `src/lib/prisma.ts`

```diff
 import { PrismaClient } from "@prisma/client";

 const globalForPrisma = globalThis as unknown as {
   prisma: PrismaClient | undefined;
 };

-function createPrismaClient() {
-  const databaseUrl = process.env.DATABASE_URL;
-  if (!databaseUrl) {
-    throw new Error("...");
-  }
-  return new PrismaClient({
-    log: process.env.NODE_ENV === "development"
-      ? ["query", "error", "warn"]
-      : ["error"],
-  });
-}
-
-export const prisma = globalForPrisma.prisma ?? createPrismaClient();
+export const prisma =
+  globalForPrisma.prisma ??
+  new PrismaClient({
+    log:
+      process.env.NODE_ENV === "development"
+        ? ["query", "error", "warn"]
+        : ["error"],
+  });

 if (process.env.NODE_ENV !== "production") {
   globalForPrisma.prisma = prisma;
 }
```

### Correção 4: `package.json` — Remover dependências não usadas

```bash
npm uninstall @prisma/adapter-pg pg @types/pg @auth/prisma-adapter
```

```diff
 "dependencies": {
-  "@auth/prisma-adapter": "^2.11.2",
-  "@prisma/adapter-pg": "^7.8.0",
   "@prisma/client": "^7.8.0",
-  "pg": "^8.22.0",
   "prisma": "^7.8.0",
   ...
 },
 "devDependencies": {
-  "@types/pg": "^8.20.0",
   ...
 }
```

### Correção 5: `package.json` — `postinstall` robusto

```diff
 "scripts": {
-  "postinstall": "prisma generate || echo '[prisma] Aviso: prisma generate falhou'",
+  "postinstall": "prisma generate",
```

### Correção 6: `src/lib/auth.ts` — Debug condicional

```diff
 export const { handlers, auth, signIn, signOut } = NextAuth({
-  debug: true,
+  debug: process.env.NODE_ENV !== "production",
```

---

## 6. Arquivos que Precisam ser Alterados

| Arquivo | Tipo de Alteração | Risco |
|---------|-------------------|-------|
| `prisma/schema.prisma` | Remover `url` do datasource | Baixo |
| `prisma.config.ts` | Adicionar `directUrl` | Baixo |
| `src/lib/prisma.ts` | Simplificar, remover wrapper | Baixo |
| `package.json` | Remover 4 dependências + corrigir script | Médio |
| `src/lib/auth.ts` | `debug` condicional | Baixo |

---

## 7. Comandos Pós-Correção

```bash
npm install                    # Remove dependências não usadas
npx prisma validate            # Verifica schema
npx prisma generate            # Gera Prisma Client
npx tsc --noEmit               # TypeScript check
npm run build                  # Build completo
```

---

## 8. Variáveis de Ambiente Finais

### `.env` (local)

```env
DATABASE_URL=postgresql://postgres:senha@db.project.supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:senha@db.project.supabase.co:5432/postgres?sslmode=require
```

### Vercel (production + preview + development)

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres:senha@db.project.supabase.co:5432/postgres?sslmode=require` |
| `DIRECT_URL` | `postgresql://postgres:senha@db.project.supabase.co:5432/postgres?sslmode=require` |

> **Nota:** `DATABASE_URL` e `DIRECT_URL` podem ser iguais porque usamos conexão direta (porta 5432). A separação é útil apenas quando se usa PgBouncer (pooler, porta 6543).

---

## 9. Riscos Restantes

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Conexões simultâneas sem pooler | Médio | Plano Free Supabase: 15 conexões. Para projeto hobby, suficiente. |
| Cold start no Vercel | Baixo | PrismaClient padrão conecta em <100ms. Primeira requisição pode ser lenta. |
| Remoção do `url` do schema | Baixo | Prisma 7 usa `prisma.config.ts` como fonte oficial. Remoção é segura. |
| `postinstall` sem `|| echo` | Baixo | Se `prisma generate` falhar, o build vai falhar (comportamento esperado). |

---

## 10. Resumo

O projeto atualmente tem **6 problemas** identificados, sendo **3 críticos** (mistura de padrões, falta de directUrl, dependências não usadas) e **3 médios/baixos**.

A arquitetura recomendada é **Prisma 7 com `prisma.config.ts` como fonte única + PrismaClient padrão** — a configuração mais estável, testada e compatível com Vercel + Supabase.

Nenhuma alteração de regra de negócio é necessária. Todas as correções são de infraestrutura/configuração.
