/**
 * Cache simples em memória com TTL.
 *
 * Nota: Em produção com múltiplas instâncias, ideal usar Redis.
 * Esta implementação é suficiente para cache de Steam API em dev/single-instance.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

// Limpeza periódica a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.expiresAt) {
      store.delete(key);
    }
  }
}, 600_000);

/**
 * Busca um valor do cache.
 */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Armazena um valor no cache com TTL.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Prefixo de chave para cache da Steam API.
 */
export function getSteamCacheKey(appId: string): string {
  return `steam:game:${appId}`;
}

/** TTL padrão: 1 hora */
export const STEAM_CACHE_TTL = 60 * 60 * 1000;
