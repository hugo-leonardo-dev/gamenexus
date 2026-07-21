import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractSteamAppId, fetchSteamGameData } from "@/lib/steam";
import { requireAuth, requireMembership, apiError, apiSuccess, handleApiError, type ApiErrorCode } from "@/lib/api-utils";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();

    const body = await request.json();
    const { steamUrl, groupId } = body;

    if (!steamUrl || typeof steamUrl !== "string" || steamUrl.length > 500) {
      return apiError("Link da Steam é obrigatório.", "VALIDATION_ERROR");
    }

    if (!groupId || typeof groupId !== "string") {
      return apiError("ID do grupo é obrigatório.", "VALIDATION_ERROR");
    }

    // Verifica se o usuário é membro do grupo
    await requireMembership(userId, groupId);

    // Extrai appId do link da Steam
    const appId = extractSteamAppId(steamUrl);
    if (!appId) {
      return apiError(
        "Link da Steam inválido. Use o formato: https://store.steampowered.com/app/ID",
        "VALIDATION_ERROR"
      );
    }

    // Verifica se o jogo já existe no grupo
    const existingGame = await prisma.game.findUnique({
      where: {
        groupId_steamAppId: {
          groupId,
          steamAppId: appId,
        },
      },
    });

    if (existingGame) {
      return NextResponse.json(
        { error: "Este jogo já foi adicionado ao grupo.", game: existingGame },
        { status: 409 }
      );
    }

    // Rate limiting para Steam API
    const { allowed, retryAfterMs } = checkRateLimit(getRateLimitKey("steam-api"));
    if (!allowed) {
      return apiError(
        `Limite de consultas excedido. Tente novamente em ${Math.ceil(retryAfterMs / 1000)}s.`,
        "RATE_LIMITED"
      );
    }

    // Busca dados na Steam API
    const gameData = await fetchSteamGameData(appId);

    // Cria o jogo no banco
    const game = await prisma.game.create({
      data: {
        groupId,
        addedById: userId,
        steamAppId: gameData.steamAppId,
        title: gameData.title,
        imageUrl: gameData.imageUrl,
        releaseDate: gameData.releaseDate,
        isReleased: gameData.isReleased,
        originalPrice: gameData.originalPrice,
        currentPrice: gameData.currentPrice,
        discountPercent: gameData.discountPercent,
        status: "BACKLOG",
        position: 0,
        reviewScore: gameData.reviewScore,
        reviewSummary: gameData.reviewSummary,
        currentPlayers: gameData.currentPlayers,
        peak24h: gameData.peak24h,
      },
      include: {
        addedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return apiSuccess({ game }, 201);
  } catch (error: any) {
    if (error.message?.includes("Steam")) {
      return apiError(error.message, "UPSTREAM_ERROR");
    }
    if (error.message?.includes("Limite de consultas")) {
      return apiError(error.message, "RATE_LIMITED");
    }
    return handleApiError(error, "api/games POST", userId);
  }
}
