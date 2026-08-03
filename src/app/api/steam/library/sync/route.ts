import { apiError, apiSuccess, handleApiError, requireAuth } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { syncSteamLibrary } from "@/lib/steam-library";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST /api/steam/library/sync
 *
 * Sincroniza manualmente a biblioteca Steam do usuário autenticado
 * (GetOwnedGames → SteamOwnedGame + lastLibrarySyncAt).
 *
 * Erros específicos (AGENTS.md §8 — nunca genéricos):
 *  - 401: não autenticado
 *  - 400: usuário não vinculou uma conta Steam
 *  - 403: perfil Steam privado / chave de API inválida
 *  - 429: rate limit (Steam ou do próprio endpoint)
 *  - 502: falha de comunicação com a Steam
 */
export async function POST() {
  try {
    const userId = await requireAuth();

    // Anti-spam do botão (o fetch à Steam já tem rate limit próprio)
    const { allowed, retryAfterMs } = checkRateLimit(`ratelimit:steam-library:${userId}`, {
      maxRequests: 3,
      windowMs: 60_000,
    });
    if (!allowed) {
      return apiError(
        `Muitas sincronizações em sequência. Tente novamente em ${Math.ceil(retryAfterMs / 1000)}s.`,
        "RATE_LIMITED"
      );
    }

    const result = await syncSteamLibrary(userId);

    if (!result.ok) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { steamId: true },
      });
      logger.warn(`[steam-library] Sincronização rejeitada (${result.code})`, {
        source: "api/steam/library/sync POST",
        userId,
        data: { steamId: user?.steamId ?? null, reason: result.code },
      });

      switch (result.code) {
        case "sem_steam_vinculada":
          return apiError(
            "Você ainda não vinculou uma conta Steam. Vincule em Configurações do Perfil antes de sincronizar.",
            "VALIDATION_ERROR"
          );
        case "perfil_privado":
          return apiError(
            "Não foi possível acessar sua biblioteca Steam: o perfil está privado ou a chave da API Steam está inválida. Torne seus detalhes de jogo públicos em Configurações da Steam > Privacidade.",
            "FORBIDDEN"
          );
        case "rate_limit":
          return apiError(
            "Limite de consultas à Steam atingido. Tente novamente em alguns minutos.",
            "RATE_LIMITED"
          );
        default:
          return apiError(
            "Falha ao consultar sua biblioteca na Steam. Tente novamente em instantes.",
            "UPSTREAM_ERROR"
          );
      }
    }

    logger.info("[steam-library] Biblioteca sincronizada", {
      source: "api/steam/library/sync POST",
      userId,
      data: { ownedCount: result.ownedCount },
    });

    return apiSuccess({
      ok: true,
      ownedCount: result.ownedCount,
      lastLibrarySyncAt: result.lastLibrarySyncAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "api/steam/library/sync POST");
  }
}
