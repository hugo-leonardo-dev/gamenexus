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

    // ─── Diagnóstico detalhado da Steam API ──────────────────────
    // Testa 3 cenários: individual (funciona), batch (funciona?), dados reais
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
    try {
      // 1. TESTE: Individual (app 570940 = Dark Souls)
      const r1 = await fetch("https://store.steampowered.com/api/appdetails?appids=570940&cc=br", {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(5000),
      });
      const b1 = await r1.text();
      const hasPrice = b1.includes('"price_overview"');
      console.log(`[cron] DIAG1: Individual(570940) status=${r1.status} hasPrice=${hasPrice} len=${b1.length}`);

      // 2. TESTE: Batch (3 appIds)
      const r2 = await fetch("https://store.steampowered.com/api/appdetails?appids=570940,374320,2644470&cc=br", {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(5000),
      });
      console.log(`[cron] DIAG2: Batch(3) status=${r2.status}`);
      if (r2.ok) {
        const b2 = await r2.text();
        console.log(`[cron] DIAG2: Batch body(200)=${b2.slice(0, 200)}`);
      }
    } catch (err: any) {
      console.error(`[cron] DIAG: Steam fetch FAILED: ${err.message}`);
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
