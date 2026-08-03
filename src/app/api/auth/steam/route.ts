import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import {
  STATE_COOKIE_MAX_AGE_SECONDS,
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  buildSteamAuthUrl,
  generateState,
  getSteamAuthConfig,
  getUseSecureCookies,
} from "@/lib/steam-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/steam
 *
 * Inicia o login Steam (OpenID 2.0):
 *  1. Rate limit.
 *  2. Gera um state aleatório de uso único (anti-CSRF) e o guarda em cookie
 *     HttpOnly/SameSite=Lax/Secure (em prod), restrito ao caminho do callback.
 *  3. Redireciona (302) para o endpoint oficial da Steam.
 */
export async function GET() {
  const { allowed } = checkRateLimit(getRateLimitKey("auth"));
  if (!allowed) {
    logger.warn("[steam-auth] Rate limit atingido ao iniciar login", {
      source: "api/auth/steam GET",
    });
    return NextResponse.redirect(
      `${getSteamAuthConfig().appUrl}/login?error=steam_tente_mais_tarde`,
      302
    );
  }

  const state = generateState();
  const redirectUrl = buildSteamAuthUrl(getSteamAuthConfig(), state);

  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: getUseSecureCookies(),
    path: STATE_COOKIE_PATH,
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
