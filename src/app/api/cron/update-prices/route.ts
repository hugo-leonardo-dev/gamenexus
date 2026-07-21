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

    console.log("[cron/update-prices] Iniciando atualização de preços...");

    const result = await updateAllGamePrices();

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
