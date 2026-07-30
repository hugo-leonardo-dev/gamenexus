import { prisma } from "./prisma";
import { fetchCurrentPlayers } from "./steam";

interface PriceResult {
  steamAppId: string;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercent: number;
}

// ─── Utilitários ──────────────────────────────────────────────────────

/** Pausa por N ms */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extrai preço do JSON da Steam, ou null se o jogo não for encontrado */
function extractPriceFromResponse(
  appId: string,
  data: Record<string, any>
): PriceResult | null {
  const game = data[appId];
  if (!game?.success || !game.data) return null;

  const info = game.data;

  if (info.is_free) {
    return { steamAppId: appId, currentPrice: 0, originalPrice: 0, discountPercent: 0 };
  }

  if (info.price_overview) {
    return {
      steamAppId: appId,
      currentPrice: info.price_overview.final,
      originalPrice: info.price_overview.initial,
      discountPercent: info.price_overview.discount_percent,
    };
  }

  return null;
}

// ─── Busca individual de preço ──────────────────────────────────────

/**
 * Busca preço de UM appId na Steam.
 * Retorna null em vez de lançar erro (tolerante a falhas).
 * Log detalhado pra debug da primeira requisição.
 */
let _debugLogged = false;

async function fetchSinglePrice(appId: string): Promise<PriceResult | null> {
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      if (!_debugLogged) {
        console.log(`[steam-prices] fetchSinglePrice(${appId}) HTTP ${response.status}`);
        _debugLogged = true;
      }
      return null;
    }

    const data = await response.json();
    const result = extractPriceFromResponse(appId, data);

    if (!_debugLogged) {
      console.log(`[steam-prices] fetchSinglePrice(${appId}) OK result=${result !== null ? "tem_preco" : "sem_preco"}`);
      _debugLogged = true;
    }

    return result;
  } catch (err: any) {
    if (!_debugLogged) {
      console.log(`[steam-prices] fetchSinglePrice(${appId}) EXCEPTION: ${err.message}`);
      _debugLogged = true;
    }
    return null;
  }
}

// ─── Busca em lote (paralela) ────────────────────────────────────────

/**
 * Busca preços de VÁRIOS appIds em PARALELO (sem batch Steam).
 * A Steam rejeita lotes da Vercel (HTTP 400), então cada requisição
 * é individual mas executada concorrentemente (Promise.all).
 */
async function fetchPricesParallel(batch: string[]): Promise<Map<string, PriceResult | null>> {
  const results = await Promise.all(
    batch.map(async (appId) => {
      const price = await fetchSinglePrice(appId);
      return [appId, price] as const;
    })
  );

  const map = new Map<string, PriceResult | null>();
  for (const [appId, price] of results) {
    map.set(appId, price);
  }

  return map;
}

// ─── Persistência no banco ──────────────────────────────────────────

async function persistPrice(
  price: PriceResult
): Promise<{ updated: boolean; error?: string }> {
  try {
    // Jogadores atuais (não crítico — falha silenciosa)
    let currentPlayers: number | null = null;
    try {
      currentPlayers = await fetchCurrentPlayers(price.steamAppId);
    } catch {}

    await prisma.game.updateMany({
      where: { steamAppId: price.steamAppId },
      data: {
        currentPrice: price.currentPrice,
        originalPrice: price.originalPrice,
        discountPercent: price.discountPercent,
        ...(currentPlayers !== null ? { currentPlayers } : {}),
      },
    });
    return { updated: true };
  } catch (err: any) {
    return { updated: false, error: err.message };
  }
}

// ─── Função principal ────────────────────────────────────────────────

/**
 * Atualiza os preços dos jogos em lotes parciais.
 *
 * Estratégia:
 * - Processa APENAS os primeiros N jogos (maxGames), ordenados pelo
 *   `updatedAt` mais antigo primeiro.
 * - Isso garante que cada execução caiba dentro dos 10s do Vercel Hobby
 *   e distribui as atualizações uniformemente entre todos os jogos.
 * - Configure o cron-job.org para rodar a cada 15-30 minutos;
 *   eventualmente todos os jogos serão atualizados.
 *
 * Híbrido por lote:
 * 1. Tenta batch de 10 appIds por vez
 * 2. Se um lote falha com 400, busca cada appId individualmente
 * 3. Performance de batch + resiliência individual
 */
export async function updateAllGamePrices(maxGames = 12, skipGames = 0): Promise<{
  totalUniqueGames: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  errors: string[];
  gamesProcessed: number;
  gamesRemaining: number;
}> {
  // Busca TODOS os appIds distintos para saber o total
  const allGames = await prisma.game.findMany({
    select: { steamAppId: true, updatedAt: true },
    distinct: ["steamAppId"],
    orderBy: { updatedAt: "asc" }, // mais antigos primeiro
  });

  const totalUniqueGames = allGames.length;

  // Aplica skip e limit em memória (93 jogos é irrelevante)
  const batchToProcess = allGames.slice(skipGames, skipGames + maxGames);
  const appIds = batchToProcess.map((g) => g.steamAppId);
  const gamesRemaining = Math.max(0, totalUniqueGames - skipGames - maxGames);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  if (appIds.length === 0) {
    return {
      totalUniqueGames,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      errors: [],
      gamesProcessed: 0,
      gamesRemaining,
    };
  }

  const BATCH_SIZE = 10;
  // NOTA: Steam rejeita lotes (appids=a,b,c) da Vercel com HTTP 400.
  // Por isso usamos fetchPricesParallel que busca cada appId
  // individualmente, mas em paralelo (Promise.all).
  for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
    const batch = appIds.slice(i, i + BATCH_SIZE);

    // Paralelo: busca cada appId individualmente, mas concorrente
    const results = await fetchPricesParallel(batch);

    // Delay entre lotes para não sobrecarregar a Steam
    if (i + BATCH_SIZE < appIds.length) {
      await delay(500);
    }

    for (const appId of batch) {
      const price = results.get(appId);

      if (!price) {
        totalSkipped++;
        continue;
      }

      const { updated, error } = await persistPrice(price);

      if (updated) {
        totalUpdated++;
      } else {
        totalErrors++;
        errors.push(`Erro ao atualizar ${appId}: ${error ?? "desconhecido"}`);
      }
    }

    // Delay entre lotes para não sobrecarregar a Steam
    if (i + BATCH_SIZE < appIds.length) {
      await delay(500);
    }
  }

  return {
    totalUniqueGames,
    totalUpdated,
    totalSkipped,
    totalErrors,
    errors,
    gamesProcessed: appIds.length,
    gamesRemaining,
  };
}
