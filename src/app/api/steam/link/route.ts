import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { getSteamAuthConfig, getUseSecureCookies } from "@/lib/steam-auth";
import {
  LINK_CALLBACK_PATH,
  LINK_STATE_COOKIE_NAME,
  LINK_STATE_COOKIE_PATH,
  LINK_STATE_MAX_AGE_SECONDS,
  buildLinkAuthUrl,
  unlinkSteamAccount,
} from "@/lib/steam-link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, handleApiError, requireAuth } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

/**
 * GET /api/steam/link
 *
 * Inicia a vinculação de conta Steam (usuário JÁ autenticado):
 *  1. Se não autenticado → redireciona para /login (fluxo de browser).
 *  2. Rate limit.
 *  3. Gera state anti-CSRF com binding do userId (cookie HttpOnly).
 *  4. Redireciona (302) para o endpoint oficial da Steam.
 */
export async function GET() {
  // Route handlers do Next exigem URLs absolutas em redirects.
  const appUrl = getSteamAuthConfig(LINK_CALLBACK_PATH).appUrl;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${appUrl}/login?callbackUrl=%2Fprofile`, 307);
  }

  const { allowed } = checkRateLimit(getRateLimitKey("auth"));
  if (!allowed) {
    logger.warn("[steam-link] Rate limit atingido ao iniciar vinculação", {
      source: "api/steam/link GET",
      userId: session.user.id,
    });
    return NextResponse.redirect(`${appUrl}/profile?error=steam_link_tente_mais_tarde`, 307);
  }

  const { redirectUrl, state } = buildLinkAuthUrl(session.user.id);

  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set(LINK_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: getUseSecureCookies(),
    path: LINK_STATE_COOKIE_PATH,
    maxAge: LINK_STATE_MAX_AGE_SECONDS,
  });
  return response;
}

/**
 * DELETE /api/steam/link
 *
 * Desvincula a conta Steam do usuário autenticado (com confirmação no front).
 * Ação destrutiva: remove o vínculo e os campos steam* (não há dados de
 * biblioteca nesta task — tasks futuras devem limpar seus dados aqui).
 */
export async function DELETE() {
  try {
    const userId = await requireAuth();

    // Só desvincula se houver vínculo — evita "sucesso" sem efeito.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { steamId: true, discordId: true, passwordHash: true },
    });
    if (!user?.steamId) {
      return apiError("Nenhuma conta Steam vinculada a este perfil.", "NOT_FOUND");
    }

    // Conta criada via Steam (sem Discord e sem senha): a Steam é o ÚNICO
    // método de login — desvincular a deixaria sem acesso (e o próximo login
    // Steam criaria uma conta nova, órfã). Exige outro método antes.
    if (!user.discordId && !user.passwordHash) {
      return apiError(
        "Sua conta foi criada com a Steam. Vincule outro método de login antes de desvincular.",
        "CONFLICT"
      );
    }

    const unlinked = await unlinkSteamAccount(userId);
    logger.info("[steam-link] Conta Steam desvinculada", {
      source: "api/steam/link DELETE",
      userId,
    });
    return apiSuccess({ unlinked: true, steamId: unlinked.steamId });
  } catch (error) {
    return handleApiError(error, "api/steam/link DELETE");
  }
}
