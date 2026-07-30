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

// ─── Busca individual (fallback) ──────────────────────────────────────

/**
 * Busca preço de UM appId na Steam.
 * Retorna null em vez de lançar erro (tolerante a falhas).
 */
async function fetchSinglePrice(appId: string): Promise<PriceResult | null> {
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&l=portuguese`,
      {
        headers: { "User-Agent": "GameNexusApp/1.0 (cron job de preços)" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return extractPriceFromResponse(appId, data);
  } catch {
    return null;
  }
}

// ─── Busca em batch (tentativa principal) ────────────────────────────

/**
 * Busca preços de VÁRIOS appIds em UMA chamada.
 * Retorna um mapa { appId → PriceResult | null }.
 * Se a Steam rejeitar o lote (HTTP 400), joga um erro específico
 * para que o caller decida se faz fallback individual.
 */
async function fetchBatchPrices(
  appIds: string[]
): Promise<Map<string, PriceResult | null>> {
  const ids = appIds.join(",");

  const response = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${ids}&cc=br&l=portuguese`,
    {
      headers: { "User-Agent": "GameNexusApp/1.0 (cron job de preços)" },
      signal: AbortSignal.timeout(15000),
    }
  );

  // Se a Steam rejeitou o lote, sinaliza fallback
  if (!response.ok) {
    throw new Error("BATCH_REJECTED");
  }

  const data = await response.json();
  const results = new Map<string, PriceResult | null>();

  for (const appId of appIds) {
    results.set(appId, extractPriceFromResponse(appId, data));
  }

  return results;
}

// ─── Estratégia híbrida ──────────────────────────────────────────────

/**
 * Tenta buscar preços em lote. Se o lote for rejeitado (400),
 * cai para busca individual de cada appId — isolando os inválidos.
 *
 * Isso dá performance de batch quando tudo está ok, e resiliência
 * individual quando algum appId específico dá problema.
 */
async function fetchPricesWithFallback(
  batch: string[]
): Promise<Map<string, PriceResult | null>> {
  // Tentativa 1: batch
  try {
    return await fetchBatchPrices(batch);
  } catch {
    // Batch rejeitado — fallback: busca cada um individualmente
  }

  const results = new Map<string, PriceResult | null>();

  for (const appId of batch) {
    const price = await fetchSinglePrice(appId);
    results.set(appId, price);
    // Delay pequeno entre individuais para não floodar a Steam
    await delay(200);
  }

  return results;
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
export async function updateAllGamePrices(maxGames = 12): Promise<{
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

  // Pega apenas os primeiros N que precisam ser atualizados
  const batchToProcess = allGames.slice(0, maxGames);
  const appIds = batchToProcess.map((g) => g.steamAppId);
  const gamesRemaining = Math.max(0, totalUniqueGames - maxGames);

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
  for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
    const batch = appIds.slice(i, i + BATCH_SIZE);

    // Híbrido: tenta batch, fallback individual se falhar
    const results = await fetchPricesWithFallback(batch);

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
