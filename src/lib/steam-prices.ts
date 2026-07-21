import { prisma } from "./prisma";
import { fetchCurrentPlayers } from "./steam";

interface SteamPriceData {
  [appId: string]: {
    success: boolean;
    data?: {
      is_free: boolean;
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
      };
    };
  };
}

interface PriceUpdate {
  steamAppId: string;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercent: number;
}

async function fetchBatchPrices(
  appIds: string[]
): Promise<PriceUpdate[]> {
  const ids = appIds.join(",");
  const url = `https://store.steampowered.com/api/appdetails?appids=${ids}&cc=br&l=portuguese`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "GameNexusApp/1.0 (cron job de atualização de preços)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Steam API respondeu com status ${response.status}`);
  }

  const data: SteamPriceData = await response.json();

  const results: PriceUpdate[] = [];

  for (const appId of appIds) {
    const game = data[appId];

    // Se a Steam não retornou dados do jogo, pula (mantém preços antigos)
    if (!game?.success || !game.data) {
      continue;
    }

    const info = game.data;

    if (info.is_free) {
      results.push({
        steamAppId: appId,
        currentPrice: 0,
        originalPrice: 0,
        discountPercent: 0,
      });
    } else if (info.price_overview) {
      results.push({
        steamAppId: appId,
        currentPrice: info.price_overview.final,
        originalPrice: info.price_overview.initial,
        discountPercent: info.price_overview.discount_percent,
      });
    }
    // Se não tem preço e não é free, pula (jogo pode não estar disponível na região)
  }

  return results;
}

/**
 * Atualiza os preços de todos os jogos cadastrados.
 * Agrupa os appIds em lotes de 10 para evitar sobrecarga na Steam API.
 */
export async function updateAllGamePrices(): Promise<{
  totalUniqueGames: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  errors: string[];
}> {
  const games = await prisma.game.findMany({
    select: { steamAppId: true },
    distinct: ["steamAppId"],
  });

  const allAppIds = games.map((g) => g.steamAppId);
  const totalUniqueGames = allAppIds.length;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  if (totalUniqueGames === 0) {
    return { totalUniqueGames: 0, totalUpdated: 0, totalSkipped: 0, totalErrors: 0, errors: [] };
  }

  const BATCH_SIZE = 10;
  const batches: string[][] = [];
  for (let i = 0; i < allAppIds.length; i += BATCH_SIZE) {
    batches.push(allAppIds.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const prices = await fetchBatchPrices(batch);

      // Conta quantos foram pulados (Steam não retornou dados)
      totalSkipped += batch.length - prices.length;

      for (const price of prices) {
        try {
          // Busca jogadores atuais (não crítico — falha silenciosa)
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
          totalUpdated++;
        } catch (err: any) {
          totalErrors++;
          errors.push(`Erro ao atualizar ${price.steamAppId}: ${err.message}`);
        }
      }

      // Pequena pausa entre lotes
      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err: any) {
      totalErrors += batch.length;
      errors.push(`Erro no lote [${batch.join(", ")}]: ${err.message}`);
    }
  }

  return { totalUniqueGames, totalUpdated, totalSkipped, totalErrors, errors };
}
