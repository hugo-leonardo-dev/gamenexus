import { prisma } from "@/lib/prisma";
import { syncSteamLibrary } from "@/lib/steam-library";
import { apiError, apiSuccess } from "@/lib/api-utils";

/**
 * GET /api/cron/steam-library-sync
 *
 * Re-sincroniza diariamente as bibliotecas Steam dos usuários vinculados.
 *
 * Mesmo padrão do cron de preços (Vercel Hobby):
 *  - `max` (padrão 5, máx 20) e `skip` — cada execução processa um lote
 *    parcial; agende em cron-job.org para rodar várias vezes ao dia.
 *  - Usuários nunca sincronizados primeiro (lastLibrarySyncAt ASC).
 *  - Falha de UM usuário NUNCA quebra o job (try/catch por usuário).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/steam-library-sync] CRON_SECRET não configurado no .env");
    return apiError("Servidor não configurado para cron job", "INTERNAL_ERROR");
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Não autorizado", "UNAUTHORIZED");
  }

  const url = new URL(request.url);
  const maxUsers = Math.max(1, Math.min(parseInt(url.searchParams.get("max") ?? "5", 10) || 5, 20));
  const skipUsers = Math.max(0, parseInt(url.searchParams.get("skip") ?? "0", 10) || 0);

  const totalUsers = await prisma.user.count({ where: { steamId: { not: null } } });

  const users = await prisma.user.findMany({
    where: { steamId: { not: null } },
    select: { id: true, steamId: true, lastLibrarySyncAt: true },
    orderBy: { lastLibrarySyncAt: "asc" }, // nunca sincronizados primeiro
    skip: skipUsers,
    take: maxUsers,
  });

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const results: Array<{ userId: string; steamId: string | null; ok: boolean; detail?: string }> = [];

  for (const user of users) {
    try {
      const res = await syncSteamLibrary(user.id);
      results.push(
        res.ok
          ? { userId: user.id, steamId: user.steamId, ok: true, detail: `ownedCount=${res.ownedCount}` }
          : { userId: user.id, steamId: user.steamId, ok: false, detail: res.code }
      );
    } catch (err) {
      console.error(`[cron/steam-library-sync] Falha ao sincronizar ${user.id}:`, err);
      results.push({ userId: user.id, steamId: user.steamId, ok: false, detail: "erro_interno" });
    }
    // Não sobrecarregar a Steam entre usuários
    if (users.length > 1) await delay(500);
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;

  console.log(
    `[cron/steam-library-sync] Concluído: ${ok}/${results.length} ok, ${failed} falhas (total usuários com Steam: ${totalUsers})`
  );

  return apiSuccess({
    success: true,
    timestamp: new Date().toISOString(),
    processed: results.length,
    ok,
    failed,
    results,
    remaining: Math.max(0, totalUsers - skipUsers - maxUsers),
  });
}
