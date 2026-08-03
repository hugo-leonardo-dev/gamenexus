import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  buildReturnToWithState,
  createAuthSessionJwt,
  extractOpenIdParams,
  extractSteamId64,
  getSessionCookieAttributes,
  getSessionCookieName,
  getSteamAuthConfig,
  isNonceUsed,
  markNonceUsed,
  validateOpenIdCallback,
  verifySteamAuthentication,
} from "@/lib/steam-auth";
import { fetchSteamProfile } from "@/lib/steam-profile";
import { upsertSteamUser } from "@/lib/steam-user";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/steam/callback
 *
 * Processa o retorno da Steam (OpenID 2.0):
 *  1. Rate limit.
 *  2. Extrai os parâmetros `openid.*`.
 *  3. Valida o state anti-CSRF (cookie x state ecoado no return_to).
 *  4. Valida parâmetros (mode, op_endpoint, claimed_id, return_to, realm, nonce).
 *  5. Anti-replay do response_nonce.
 *  6. Confirma com a Steam via check_authentication (is_valid:true + eco).
 *  7. Extrai o SteamID64 do claimed_id e faz upsert idempotente do usuário.
 *  8. Cria o JWT de sessão Auth.js (mesma sessão de Discord/Email) e redireciona
 *     para um caminho interno (sem open redirect).
 *
 * Falhas redirecionam para /login?error=steam_* sem expor detalhes internos.
 */
export async function GET(request: NextRequest) {
  const config = getSteamAuthConfig();
  const appUrl = config.appUrl;

  const { allowed } = checkRateLimit(getRateLimitKey("auth"));
  if (!allowed) {
    return NextResponse.redirect(`${appUrl}/login?error=steam_tente_mais_tarde`, 302);
  }

  const params = extractOpenIdParams(new URL(request.url).searchParams);
  if (!params) return fail(appUrl, "sem_parametros");

  // ── CSRF: o state do cookie deve bater com o state ecoado no return_to ──
  const cookieState = request.cookies.get(STATE_COOKIE_NAME)?.value;
  let returnToState: string | null = null;
  try {
    returnToState = new URL(params.return_to).searchParams.get("state");
  } catch {
    // return_to malformado → tratado abaixo
  }
  if (!cookieState || !returnToState || cookieState.length < 32 || cookieState !== returnToState) {
    return fail(appUrl, "state_invalido");
  }

  // ── Validação dos parâmetros OpenID ──
  const validation = validateOpenIdCallback(
    params,
    config.realm,
    buildReturnToWithState(config, cookieState)
  );
  if (!validation.ok) return fail(appUrl, validation.reason);

  // ── Anti-replay: rejeita nonce já usado em login bem-sucedido ──
  if (isNonceUsed(params.response_nonce)) {
    return fail(appUrl, "nonce_reutilizado");
  }

  // ── Confirmação real com a Steam (check_authentication) ──
  if (!(await verifySteamAuthentication(params))) {
    return fail(appUrl, "verificacao_falhou");
  }

  // Só marca o nonce como usado APÓS a verificação aceita (evita queimar
  // nonces em tentativas falhas e permitir DoS no login do usuário real).
  markNonceUsed(params.response_nonce);

  const steamId = extractSteamId64(params.claimed_id);
  if (!steamId) return fail(appUrl, "claimed_id_invalido");

  // ── Perfil público (opcional): falha nunca invalida o login verificado ──
  const profile = await fetchSteamProfile(steamId);

  try {
    const user = await upsertSteamUser(steamId, profile);
    const sessionToken = await createAuthSessionJwt(user);

    const response = NextResponse.redirect(`${appUrl}/`, 302);
    // Sessão Auth.js — novo jti a cada login (anti session fixation)
    response.cookies.set(getSessionCookieName(), sessionToken, getSessionCookieAttributes());
    // Consome o state (uso único)
    response.cookies.set(STATE_COOKIE_NAME, "", {
      ...getSessionCookieAttributes(),
      path: STATE_COOKIE_PATH,
      maxAge: 0,
    });
    return response;
  } catch (err) {
    logger.error(
      "[steam-auth] Falha ao persistir usuário ou criar sessão",
      { source: "api/auth/steam/callback GET", data: { steamId } },
      err
    );
    return fail(appUrl, "erro_interno");
  }
}

function fail(appUrl: string, reason: string) {
  logger.warn(`[steam-auth] Login rejeitado (${reason})`, {
    source: "api/auth/steam/callback GET",
    data: { reason },
  });
  return NextResponse.redirect(`${appUrl}/login?error=steam_${reason}`, 302);
}
