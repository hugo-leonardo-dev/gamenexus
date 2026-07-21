# 🗄️ Auditoria Redis — GameNexus

> **Documento:** `docs/03-redis-audit.md`
> **Status:** Configurado na infraestrutura, não usado em código
> **Data:** Julho 2026

---

## Sumário

1. [Status Atual](#1-status-atual)
2. [Onde Redis Poderia Ser Usado](#2-onde-redis-poderia-ser-usado)
3. [Análise de Impacto](#3-análise-de-impacto)
4. [Plano de Migração](#4-plano-de-migração)
5. [Configuração Docker](#5-configuração-docker)

---

## 1. Status Atual

### ❌ Redis NÃO está sendo usado em código

Redis está **configurado na infraestrutura** (Docker Compose) mas **zero linhas de código** utilizam Redis atualmente. Toda funcionalidade que poderia usar Redis opera **em memória** via `Map` do Node.js.

### Infraestrutura já preparada

```yaml
# docker-compose.yml (já configurado)
redis:
  image: redis:7-alpine
  container_name: gamenexus-redis
  restart: unless-stopped
  volumes:
    - redisdata:/data
  command:
    - "redis-server"
    - "--save" "3600" "1"           # Snapshot a cada 1h se houver 1+ mudança
    - "--save" "300" "100"          # Snapshot a cada 5min se houver 100+ mudanças
    - "--maxmemory" "64mb"           # Máximo de 64MB (VM Oracle: 1GB RAM)
    - "--maxmemory-policy" "allkeys-lru"  # LRU quando atingir limite
    - "--appendonly" "no"            # Sem AOF (cache puro, sem necessidade de persistência total)
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3
```

Env var já configurada no service `app`:
```yaml
- REDIS_URL=redis://redis:6379
```

---

## 2. Onde Redis Poderia Ser Usado

### 2.1 Cache Steam API (`src/lib/cache.ts`)

**Implementação atual — Map em memória:**

```ts
const store = new Map<string, CacheEntry<any>>();

export function cacheGet<T>(key: string): T | null { ... }
export function cacheSet<T>(key: string, data: T, ttlMs: number): void { ... }
```

| Aspecto | Atual (Map) | Com Redis |
|---------|-------------|-----------|
| Persistência | Perdido no restart | Mantido entre restarts |
| Isolamento | Por instância | Compartilhado |
| TTL | Manual (setInterval) | Nativo (TTL) |
| Limpeza | `setInterval` a cada 10min | Automática |

**Dados armazenados:**
| Chave | Valor | TTL |
|-------|-------|-----|
| `steam:game:{appId}` | `SteamGameData` | 1h |
| `steam:search:{query}` | `SteamSearchResult[]` | 30min |

**Com Redis:**
```ts
import { Redis } from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet<T>(key: string, data: T, ttlMs: number): Promise<void> {
  await redis.setex(key, ttlMs / 1000, JSON.stringify(data));
}
```

---

### 2.2 Rate Limiting (`src/lib/rate-limit.ts`)

**Implementação atual — Map em memória:**

```ts
const windows = new Map<string, WindowEntry>();

export function checkRateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } { ... }
```

| Aspecto | Atual (Map) | Com Redis |
|---------|-------------|-----------|
| Persistência | Resetado no restart | Mantido |
| Escala | Por instância | Compartilhado |
| Precisão | Sliding window | Sliding window com sorted sets |

**Com Redis (sliding window usando sorted sets):**
```ts
const now = Date.now();
const windowKey = `ratelimit:steam:${Date.now() - windowMs}`;

// Transação: adiciona timestamp, remove expirados, conta
const multi = redis.multi();
multi.zadd(windowKey, now, `${now}:${Math.random()}`);
multi.zremrangebyscore(windowKey, 0, now - windowMs);
multi.zcard(windowKey);
multi.expire(windowKey, Math.ceil(windowMs / 1000));
const [, , count] = await multi.exec();

const allowed = (count as number) <= maxRequests;
```

---

### 2.3 Sessões NextAuth

| Item | Atual | Com Redis | Conclusão |
|------|-------|-----------|-----------|
| Estratégia | JWT | Database sessions | **Não precisa.** JWT é self-contained |

---

### 2.4 Filas/Jobs (`src/lib/steam-prices.ts`)

| Item | Atual | Com Redis (BullMQ) |
|------|-------|--------------------|
| Implementação | Síncrono: `for` loop com `await` e delay 500ms | Job queue assíncrona |
| Resiliência | Falha no meio = job incompleto | Retry automático |
| Monitoramento | Logs apenas | Dashboard Bull Board |
| Prioridade | N/A | Job prioritário |

**Recomendação:** 🔵 Baixa prioridade — implementação atual funciona para o volume.

---

## 3. Análise de Impacto

### 3.1 Prioridade de Implementação

| Prioridade | Componente | Esforço | Benefício |
|------------|-----------|---------|-----------|
| 🔴 Alta | Cache Steam API → Redis | 2h | Cache persiste entre restarts, prepara para multi-instance |
| 🟡 Média | Rate limiting → Redis | 2h | Rate limit persiste entre restarts |
| 🔵 Baixa | BullMQ para preços | 4h | Jobs assíncronos não bloqueiam |

### 3.2 Impacto na Oracle VM (1GB RAM)

| Container | RAM Estimada | Com Redis |
|-----------|-------------|-----------|
| Next.js | ~250MB | ~250MB |
| PostgreSQL | ~250MB | ~250MB |
| Redis | — | **~50-80MB** |
| Nginx | ~30MB | ~30MB |
| OS | ~300MB | ~300MB |
| **Total** | **~830MB** | **~910MB** |

⚠️ Com Redis, o uso de RAM se aproxima do limite de 1GB. Considerar:
- Otimizar PostgreSQL (`shared_buffers=128MB` em vez de 256MB)
- Redis com `maxmemory 32mb` inicialmente
- Ou rodar sem Redis até necessidade real

---

## 4. Plano de Migração

### Passo a Passo para Cache → Redis

1. **Instalar dependência:**
   ```bash
   npm install ioredis
   ```

2. **Criar conexão Redis:**
   ```ts
   // src/lib/redis.ts
   import { Redis } from "ioredis";

   const globalForRedis = globalThis as unknown as {
     redis: Redis | undefined;
   };

   export const redis =
     globalForRedis.redis ??
     new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
       maxRetriesPerRequest: 3,
       retryStrategy: (times) => Math.min(times * 50, 2000),
       lazyConnect: true,
     });

   if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
   ```

3. **Refatorar `src/lib/cache.ts`:**
   - Substituir `Map` por chamadas `redis.get()`/`redis.setex()`
   - Manter fallback para memória se Redis não estiver disponível
   - Remover `setInterval` de limpeza (TTL nativo)

4. **Refatorar `src/lib/rate-limit.ts`:**
   - Substituir sliding window em `Map` por sorted sets no Redis
   - Manter fallback para memória

5. **Testar:**
   - Verificar cache funcionando após restart
   - Verificar rate limit persistente
   - Monitorar uso de RAM

---

## 5. Configuração Docker

A configuração do Redis no Docker Compose já está otimizada para Oracle Cloud:

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `maxmemory` | 64mb | VM tem 1GB RAM total |
| `maxmemory-policy` | allkeys-lru | Cache puro — LRU é ideal |
| `appendonly` | no | Sem necessidade de AOF (cache apenas) |
| `save 3600 1` | Snapshot a cada 1h | Persistência mínima para evitar cache frio |
| `save 300 100` | Snapshot a cada 5min se ativo | Evitar perda de muitas entradas |
| `redisdata` volume | Persistente | Dados sobrevivem a restart |

---

## Referências

- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Documentation](https://redis.io/documentation)
- [BullMQ Documentation](https://docs.bullmq.io/)

---

*Documento gerado via auditoria de código-fonte em Julho de 2026.*
