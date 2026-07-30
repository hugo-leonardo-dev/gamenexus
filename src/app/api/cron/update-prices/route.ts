import { updateAllGamePrices } from "@/lib/steam-prices";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[cron/update-prices] CRON_SECRET não configurado no .env");
      return apiError("Servidor não configurado para cron job", "INTERNAL_ERROR");
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("Não autorizado", "UNAUTHORIZED");
    }

    const url = new URL(request.url);
    const maxParam = url.searchParams.get("max");
    const skipParam = url.searchParams.get("skip");
    const maxGames = maxParam
      ? Math.max(1, Math.min(parseInt(maxParam, 10) || 12, 50))
      : 12;
    const skipGames = skipParam
      ? Math.max(0, parseInt(skipParam, 10) || 0)
      : 0;

    console.log(`[cron/update-prices] Iniciando atualização (max: ${maxGames}, skip: ${skipGames})...`);

    const result = await updateAllGamePrices(maxGames, skipGames);

    console.log(
      `[cron/update-prices] Concluído: ${result.totalUpdated}/${result.totalUniqueGames} únicos, ${result.totalErrors} erros`
    );

    if (result.errors.length > 0) {
      console.error("[cron/update-prices] Erros:", result.errors);
    }

    return apiSuccess({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[cron/update-prices] Erro fatal:", error);
    return apiError(
      `Erro interno ao atualizar preços: ${error.message}`,
      "INTERNAL_ERROR"
    );
  }
}
