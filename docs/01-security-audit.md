# 🔒 Auditoria de Segurança — GameNexus

> **Documento:** `docs/01-security-audit.md`
> **Status:** Pendente de implementação
> **Data:** Julho 2026
> **Próxima revisão:** Após implementar correções prioritárias

---

## Sumário

1. [Autenticação](#1-autenticação)
2. [Autorização](#2-autorização)
3. [Rate Limiting](#3-rate-limiting)
4. [Validação de Inputs](#4-validação-de-inputs)
5. [Cron Job](#5-cron-job)
6. [Proteção de Dados](#6-proteção-de-dados)
7. [Headers de Segurança HTTP](#7-headers-de-segurança-http)
8. [Resumo de Risco](#8-resumo-de-risco)
9. [Plano de Ação](#9-plano-de-ação)

---

## 1. Autenticação

### ✅ Pontos Fortes

| Item | Detalhes |
|------|----------|
| JWT Strategy | Sessão via JWT — escalável, sem consultas ao banco a cada requisição |
| Discord OAuth | Client ID/Secret configurados, upsert de usuário no banco |
| bcrypt passwords | 12 rounds de salt no hash — custo adequado |
| Email normalizado | Convertido para lowercase antes de salvar (previne duplicatas) |
| `AUTH_SECRET` | Variável de ambiente usada para encriptar tokens JWT |

### ⚠️ Pontos de Atenção

| ID | Item | Risco | Localização |
|----|------|-------|-------------|
| A-01 | `debug: true` ativo | **Médio** — logs detalhados em produção vazam info de sessão | `src/lib/auth.ts` |
| A-02 | Sem rate limit no login | **Alto** — permite brute force de senhas | `src/lib/auth.ts` (credentials) |
| A-03 | Sem rate limit no registro | **Médio** — permite criação massiva de contas | `src/app/api/auth/register/route.ts` |
| A-04 | `trustHost: true` | **Médio** — desabilita proteção CSRF de host header | `src/lib/auth.ts` |

### 🔧 Correções Recomendadas

```ts
// A-01: Debug condicional
debug: process.env.NODE_ENV !== "production",

// A-04: trustHost específico em produção
trustHost: process.env.NODE_ENV === "production"
  ? ["gamenexus.seudominio.com"]
  : true,

// A-02 e A-03: Rate limit antes do authorize/register
const ip = request.headers.get("x-forwarded-for") ?? "unknown";
const { allowed } = checkRateLimit(`auth:login:${ip}`, {
  maxRequests: 5,
  windowMs: 60_000,
});
if (!allowed) return apiError("Muitas tentativas. Tente novamente em 1 minuto.", "RATE_LIMITED");
```

---

## 2. Autorização

### ✅ Pontos Fortes

| Item | Detalhes | Arquivos |
|------|----------|----------|
| `requireAuth()` | Verifica sessão e retorna userId | Todas as rotas de API |
| `requireMembership()` | Verifica se usuário é membro do grupo | games, groups endpoints |
| `requireOwner()` | Restringe ações apenas para OWNER | member removal |
| Proteção último owner | Bloqueia remoção do único dono do grupo | `src/lib/groups.ts` |
| Transações Prisma | Operações críticas (delete+reorder) em transactions | move, delete game |
| Erros padronizados | `apiError()` com códigos tipados | `src/lib/api-utils.ts` |
| Game pertence ao grupo | Verificação `game.groupId === groupId` no move e delete | move/route.ts |

### ⚠️ Observação de Design

O escopo define que **TODO MEMBRO** (MEMBER ou OWNER) pode adicionar, remover, mover jogos. Não há distinção de permissão para operações em jogos. **Isso é decisão de design, não bug de segurança.**

---

## 3. Rate Limiting

### ✅ Pontos Fortes

| Item | Detalhes | Localização |
|------|----------|-------------|
| Steam API rate limit | 10 req/min — protege contra ban da Steam | `src/lib/rate-limit.ts` |
| Cache de respostas Steam | TTL de 1 hora, reduz chamadas repetidas | `src/lib/cache.ts` |
| Limpeza periódica | A cada 5 minutos, entradas expiradas são removidas | `src/lib/rate-limit.ts` |

### ⚠️ Pontos de Atenção

| ID | Item | Risco | Recomendação |
|----|------|-------|--------------|
| RL-01 | Em memória (não Redis) | **Médio** — não funciona com múltiplas instâncias | Migrar para Redis |
| RL-02 | Global (não por usuário/IP) | **Baixo** — um usuário pode exaurir o limite de todos | Adicionar chave por IP |
| RL-03 | Auth sem rate limit | **Alto** — ver A-02 e A-03 | Adicionar rate limit específico |

---

## 4. Validação de Inputs

### ✅ Pontos Fortes

| Item | Detalhes |
|------|----------|
| Group name max length | 50 caracteres |
| Password min/max | 6-128 caracteres |
| Email normalizado | `.toLowerCase().trim()` |
| Steam URL max length | 500 caracteres |
| Invite code max length | 10 caracteres |
| Position validation | Deve ser número >= 0 |
| Status validation | Apenas valores do enum `VALID_STATUSES` |

### ⚠️ Pontos de Atenção

| ID | Item | Risco | Localização |
|----|------|-------|-------------|
| VI-01 | Email validation fraca | **Médio** — apenas verifica `@` e `.` | `register/route.ts` |
| VI-02 | Sem sanitização HTML | **Médio** — nomes podem conter HTML/XSS | `groups/route.ts`, register |
| VI-03 | Sem validação de domínio Steam | **Baixo** — só usa regex `\/app\/(\d+)` | `src/lib/steam.ts` |

### 🔧 Correções Recomendadas

```ts
// VI-01: Email validation com regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email))
  return apiError("Email inválido", "VALIDATION_ERROR");

// VI-02: Sanitização simples
const sanitizedName = name.trim().replace(/<[^>]*>/g, "");
```

---

## 5. Cron Job

### ✅ Pontos Fortes

| Item | Detalhes |
|------|----------|
| Bearer token auth | `Authorization: Bearer ${CRON_SECRET}` |
| Erro se CRON_SECRET ausente | Retorna erro 500 se não configurado |
| Timeout de 15s no fetch | `AbortSignal.timeout(15000)` |

### ⚠️ Pontos de Atenção

| ID | Item | Risco | Recomendação |
|----|------|-------|--------------|
| CJ-01 | Token comparison `!==` não é constant-time | **Baixo** — risco teórico | Usar `crypto.timingSafeEqual()` |

---

## 6. Proteção de Dados

### ✅ Pontos Fortes

| Item | Detalhes |
|------|----------|
| bcrypt 12 rounds | Custo adequado para hash de senhas |
| `select` nas queries Prisma | Apenas campos necessários retornados |
| `passwordHash` nunca exposto | Ausente de selects em todas as queries |
| Modo produção esconde erros | `"Erro interno do servidor."` genérico |

---

## 7. Headers de Segurança HTTP

### ❌ Pendências

| ID | Header | Função | Prioridade |
|----|--------|--------|------------|
| HS-01 | `Content-Security-Policy` | Mitiga XSS controlando fontes | **Alta** |
| HS-02 | `X-Frame-Options: DENY` | Previne clickjacking | **Média** |
| HS-03 | `X-Content-Type-Options: nosniff` | Previne MIME sniffing | **Média** |
| HS-04 | `Strict-Transport-Security` | Força HTTPS | **Baixa** |
| HS-05 | `Referrer-Policy` | Controla envio de referrer | **Baixa** |

### 🔧 Correção Recomendada

Adicionar via `next.config.ts` ou middleware:

```ts
// middleware.ts
import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https:; connect-src 'self' https://store.steampowered.com https://api.steampowered.com"
  );

  return response;
}
```

---

## 8. Resumo de Risco

| Categoria | Status | Cor |
|-----------|--------|-----|
| **Autenticação** | 🟡 Regular — debug ativo, sem rate limit em login | Amarelo |
| **Autorização** | 🟢 Bom — todas as rotas protegidas | Verde |
| **Rate Limiting** | 🟡 Regular — apenas Steam API, sem Redis | Amarelo |
| **Validação Inputs** | 🟡 Regular — falta sanitização HTML | Amarelo |
| **Cron Job** | 🟢 Bom — Bearer token, timeout | Verde |
| **Dados** | 🟢 Bom — bcrypt, selects, production safety | Verde |
| **Headers HTTP** | 🔴 Ausente — sem CSP, HSTS, X-Frame-Options | Vermelho |

---

## 9. Plano de Ação

### 🔴 Prioridade Alta (Fazer Primeiro)

| ID | Tarefa | Arquivo | Esforço |
|----|--------|---------|---------|
| A-01 | Desativar `debug` em produção | `src/lib/auth.ts` | 1 min |
| A-02 | Rate limit no login | `src/lib/auth.ts` | 15 min |
| A-03 | Rate limit no registro | `register/route.ts` | 15 min |
| HS-01 | Adicionar CSP header | `next.config.ts` ou `middleware.ts` | 20 min |

### 🟡 Prioridade Média

| ID | Tarefa | Arquivo | Esforço |
|----|--------|---------|---------|
| VI-01 | Email validation com regex | `register/route.ts` | 5 min |
| VI-02 | Sanitização HTML em nomes | `groups/route.ts`, register | 10 min |
| HS-02 | X-Frame-Options | `middleware.ts` | 2 min |
| RL-01 | Migrar rate limit para Redis | `src/lib/rate-limit.ts` | 1-2h |

### 🔵 Prioridade Baixa

| ID | Tarefa | Arquivo | Esforço |
|----|--------|---------|---------|
| VI-03 | Validar domínio Steam URL | `src/lib/steam.ts` | 10 min |
| CJ-01 | Timing-safe token comparison | `cron/update-prices/route.ts` | 5 min |
| RL-02 | Rate limit por IP/userId | `src/lib/rate-limit.ts` | 30 min |

---

*Documento gerado via auditoria de código-fonte em Julho de 2026.*
