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
    const maxGames = maxParam
      ? Math.max(1, Math.min(parseInt(maxParam, 10) || 12, 50))
      : 12;

    console.log(`[cron/update-prices] Iniciando atualização de preços (max: ${maxGames})...`);

    // ─── Diagnóstico: testa uma chamada Steam real ─────────────────
    // Pra descobrir se a Steam está bloqueando o IP da Vercel ou
    // se o problema é no parsing dos dados.
    try {
      const testUrl = "https://store.steampowered.com/api/appdetails?appids=570940&cc=br&l=portuguese";
      const testResp = await fetch(testUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(5000),
      });
      const testBody = await testResp.text();
      console.log(`[cron/update-prices] DIAG: Steam status=${testResp.status}, body(300 chars)=${testBody.slice(0, 300)}`);
    } catch (err: any) {
      console.error(`[cron/update-prices] DIAG: Steam fetch FAILED: ${err.message}`);
    }

    const result = await updateAllGamePrices(maxGames);

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
