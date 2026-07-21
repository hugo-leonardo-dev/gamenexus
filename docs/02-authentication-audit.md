# 🔐 Auditoria NextAuth/Auth.js — GameNexus

> **Documento:** `docs/02-authentication-audit.md`
> **Status:** Pendente de implementação
> **Data:** Julho 2026

---

## Sumário

1. [Stack Atual](#1-stack-atual)
2. [Configuração Detalhada](#2-configuração-detalhada)
3. [Provedores](#3-provedores)
4. [Fluxo de Autenticação](#4-fluxo-de-autenticação)
5. [Análise de Segurança](#5-análise-de-segurança)
6. [Mudanças para Produção](#6-mudanças-para-produção)
7. [Recomendações](#7-recomendações)

---

## 1. Stack Atual

| Componente | Versão | Detalhe |
|------------|--------|---------|
| `next-auth` | 5.0.0-beta.31 | Framework de autenticação |
| `@auth/core` | 0.41.2 | Core do Auth.js v5 |
| `@auth/prisma-adapter` | 2.11.2 | **Instalado mas NÃO usado** |
| Session Strategy | `jwt` | Sessão via token JWT |
| Providers | 2 | Discord OAuth + Credentials (email/senha) |

### Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `src/lib/auth.ts` | Configuração central do NextAuth |
| `src/app/api/auth/[...nextauth]/route.ts` | Handler das rotas de auth |
| `src/components/ui/SessionProvider.tsx` | Provider React para session |
| `src/components/layout/AuthButton.tsx` | Botão de login/logout |
| `src/lib/api-utils.ts` | Helper `requireAuth()` |
| `prisma/schema.prisma` | Modelos Account, Session, VerificationToken |

---

## 2. Configuração Detalhada

```ts
// src/lib/auth.ts — Configuração Atual
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,                                    // 🟡 DEVE SER CONDICIONAL
  trustHost: true,                                // 🟡 DEVE SER ESPECÍFICO EM PROD
  secret: process.env.AUTH_SECRET,                // ✅ Correto

  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,     // 🟡 Non-null assertion
      clientSecret: process.env.AUTH_DISCORD_SECRET!, // 🟡 Non-null assertion
    }),
    Credentials({ /* authorize com bcrypt */ }),   // ✅ Correto
  ],

  callbacks: {
    signIn({ account, profile }) { /* upsert manual */ }, // ⚠️ Manual, sem adapter
    jwt({ token, account, profile }) { /* associa ID */ }, // ✅ Correto
    session({ session, token }) { /* injeta ID */ },       // ✅ Correto
  },

  pages: { signIn: "/login" },                     // ✅ Correto
  session: { strategy: "jwt" },                    // ✅ Correto
});
```

---

## 3. Provedores

### 3.1 Discord OAuth

| Item | Valor | Nota |
|------|-------|------|
| Client ID | `AUTH_DISCORD_ID` | Obrigatório |
| Client Secret | `AUTH_DISCORD_SECRET` | Obrigatório, sensível |
| Redirect URI (dev) | `http://localhost:3000/api/auth/callback/discord` | Configurar no Discord Portal |
| Redirect URI (prod) | `https://gamenexus.com/api/auth/callback/discord` | **PRECISA ADICIONAR** |

**Fluxo:** Discord → Callback → `signIn` callback → `prisma.user.upsert` → JWT token

### 3.2 Credentials (Email/Senha)

| Item | Valor | Nota |
|------|-------|------|
| Hash | bcrypt (12 rounds) | ✅ Seguro |
| Validação | Email lowercase + `@` e `.` | 🟡 Fraca |
| Rate limit | ❌ Nenhum | 🔴 Risco de brute force |

**Fluxo:** Email+Senha → `authorize()` → `prisma.user.findUnique` → bcrypt.compare → JWT token

---

## 4. Fluxo de Autenticação

### 4.1 Login com Discord

```
Usuário → Clica "Entrar com Discord"
  → Redireciona para Discord OAuth
  → Usuário autoriza
  → Discord redireciona para /api/auth/callback/discord
  → NextAuth processa callback
  → signIn() callback:
      1. Upsert usuário (discordId, name, avatar, email)
      2. Upsert account (access_token, refresh_token, etc.)
  → jwt() callback:
      1. Busca usuário no banco por discordId
      2. Associa dbUser.id ao token
  → Redireciona para /dashboard
```

### 4.2 Login com Email/Senha

```
Usuário → Preenche email + senha
  → POST /api/auth/callback/credentials
  → authorize() callback:
      1. Busca usuário por email
      2. bcrypt.compare(password, user.passwordHash)
      3. Retorna user { id, name, email, image }
  → jwt() callback:
      1. Assoc ia token.sub (do authorize) como token.id
  → session() callback:
      1. Injeta token.id em session.user.id
  → Redireciona para /dashboard
```

### 4.3 Verificação de Sessão

```ts
// src/lib/api-utils.ts
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Não autenticado");
  return session.user.id;
}
```

Usado em **todas as rotas de API** para garantir autenticação.

---

## 5. Análise de Segurança

### ✅ Pontos Fortes

| Item | Detalhe |
|------|---------|
| JWT Strategy | Token assinado com `AUTH_SECRET` — sem sessões em banco |
| bcrypt 12 rounds | Custo adequado para hash de senhas |
| `pages.signIn` custom | Página de login própria, sem expor detalhes |
| SessionProvider config | `refetchInterval={5*60}`, sem refetch on focus |
| Account linking manual | Upsert controlado no `signIn` callback |
| Modelos Prisma | Account, Session, VerificationToken presentes |

### 🟡 Pontos de Atenção

| ID | Item | Risco | Detalhe |
|----|------|-------|---------|
| NA-01 | `debug: true` em produção | Médio | Loga tokens e profiles no stdout |
| NA-02 | `trustHost: true` | Médio | CSRF contra host header attacks |
| NA-03 | Non-null assertions `!` | Médio | Erro runtime confuso se env var faltar |
| NA-04 | Sem rate limit no login | Alto | Permite brute force de senhas |
| NA-05 | Sem rate limit no registro | Médio | Permite criação massiva de contas |
| NA-06 | `@auth/prisma-adapter` instalado mas não usado | Baixo | Dependência desnecessária |
| NA-07 | JWT sem expiração explícita | Médio | Default 30 dias — reduzir para 7? |

### 🔴 Ausente

| Item | Importância |
|------|-------------|
| Validação de env vars obrigatórias no startup | Evita crash silencioso |

---

## 6. Mudanças para Produção

### 🔴 Obrigatórias

| # | O quê | Valor Dev | Valor Produção | Onde |
|---|-------|-----------|----------------|------|
| 1 | **Discord Redirect URI** | `http://localhost:3000/api/auth/callback/discord` | `https://gamenexus.com/api/auth/callback/discord` | Discord Developer Portal |
| 2 | **NEXTAUTH_URL** | `http://localhost:3000` | `https://gamenexus.com` | `.env` |
| 3 | **AUTH_SECRET** | Valor local | **Gerar novo:** `openssl rand -hex 32` | `.env` |
| 4 | **`debug`** | `true` | `false` ou condicional | `auth.ts` |
| 5 | **`trustHost`** | `true` | `["gamenexus.com"]` ou manter com Nginx | `auth.ts` |

### 🟡 Recomendadas

| # | O quê | Motivo |
|---|-------|--------|
| 6 | Validação de env vars obrigatórias | Evitar crash silencioso se faltar config |
| 7 | Rate limit no credentials provider | Prevenir brute force |
| 8 | Rate limit no register endpoint | Prevenir criação massiva |

---

## 7. Recomendações

### Código Proposto para `auth.ts`

```ts
// Validação de env vars obrigatórias (adi cionar no topo do arquivo)
if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET é obrigatória");
if (!process.env.AUTH_DISCORD_ID) throw new Error("AUTH_DISCORD_ID é obrigatória");
if (!process.env.AUTH_DISCORD_SECRET) throw new Error("AUTH_DISCORD_SECRET é obrigatória");

// Configuração modificada
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",   // Condicional
  trustHost: process.env.NODE_ENV !== "production"  // Ou array com domínios
    ? true
    : ["gamenexus.com", "www.gamenexus.com"],
  secret: process.env.AUTH_SECRET,
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
    // ...
  ],
  // ...
});
```

### Por que NÃO usar o PrismaAdapter?

O `@auth/prisma-adapter` está instalado mas **não é usado propositalmente**. Motivos:

1. **JWT Strategy** — Não precisamos de sessões em banco. O adapter é útil para database sessions
2. **Controle manual** — O `signIn` callback faz upsert manual que dá mais controle sobre campos
3. **Performance** — Evita queries extras ao banco em cada requisição

**Recomendação:** Manter como está. O adapter pode ser útil no futuro se migrar para database sessions.

---

## Referências

- [Auth.js v5 Documentation](https://authjs.dev/reference/nextjs)
- [NextAuth.js GitHub](https://github.com/nextauthjs/next-auth)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

*Documento gerado via auditoria de código-fonte em Julho de 2026.*
