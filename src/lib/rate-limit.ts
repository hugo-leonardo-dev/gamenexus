/**
 * Rate limiter simples em memória (sliding window).
 * Limita requisições a um determinado número por janela de tempo.
 *
 * Nota: Em produção com múltiplas instâncias, ideal usar Redis.
 * Esta implementação é suficiente para evitar ban da Steam em dev/single-instance.
 */

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

// Limpeza periódica a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows.entries()) {
    // Remove entradas com timestamps mais antigos que 2 janelas
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
    if (entry.timestamps.length === 0) {
      windows.delete(key);
    }
  }
}, 300_000);

export interface RateLimitConfig {
  /** Máximo de requisições permitidas */
  maxRequests: number;
  /** Janela de tempo em milissegundos */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10 requisições
  windowMs: 60_000, // por minuto
};

/**
 * Verifica se a requisição pode passar. Se sim, registra e retorna true.
 * Se não, retorna false e uma mensagem de quando tentar novamente.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let entry = windows.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    windows.set(key, entry);
  }

  // Remove timestamps expirados
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldest);
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Gera uma chave de rate limit baseada no tipo de operação.
 */
export function getRateLimitKey(type: "steam-api" | "auth"): string {
  return `ratelimit:${type}`;
}
