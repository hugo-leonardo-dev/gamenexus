import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { extractOpenIdParams, getSteamAuthConfig, getUseSecureCookies } from "@/lib/steam-auth";
import {
  LINK_CALLBACK_PATH,
  LINK_STATE_COOKIE_NAME,
  LINK_STATE_COOKIE_PATH,
  linkSteamAccount,
} from "@/lib/steam-link";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/steam/link/callback
 *
 * Processa o retorno da Steam (OpenID 2.0) para VINCULAÇÃO de conta:
 *  1. Rate limit.
 *  2. Extrai parâmetros `openid.*`.
 *  3. Valida o state anti-CSRF (cookie x return_to).
 *  4. `linkSteamAccount`: binding de sessão + validação local + anti-replay +
 *     check_authentication + conflitos + persistência (toda a lógica no
 *     serviço, reutilizando o protocolo de steam-auth.ts).
 *  5. Redireciona para /profile (sem open redirect) com resultado.
 *
 * O state (cookie HttpOnly de uso único) é consumido em TODAS as saídas.
 * Erros redirecionam para /profile?error=steam_link_* sem expor detalhes.
 */
export async function GET(request: NextRequest) {
  const config = getSteamAuthConfig(LINK_CALLBACK_PATH);
  const appUrl = config.appUrl;

  const { allowed } = checkRateLimit(getRateLimitKey("auth"));
  if (!allowed) return fail(appUrl, "tente_mais_tarde");

  const session = await auth();
  const sessionUserId = session?.user?.id ?? null;

  const params = extractOpenIdParams(new URL(request.url).searchParams);
  if (!params) return fail(appUrl, "sem_parametros", sessionUserId ?? undefined);

  // ── CSRF: o state do cookie deve bater com o state ecoado no return_to ──
  const cookieState = request.cookies.get(LINK_STATE_COOKIE_NAME)?.value;
  let returnToState: string | null = null;
  try {
    returnToState = new URL(params.return_to).searchParams.get("state");
  } catch {
    // return_to malformado → tratado abaixo
  }
  if (!cookieState || !returnToState || cookieState !== returnToState) {
    return fail(appUrl, "state_invalido", sessionUserId ?? undefined);
  }

  let result;
  try {
    result = await linkSteamAccount(params, cookieState, sessionUserId);
  } catch (err) {
    // Corrida entre dois callbacks com o mesmo SteamID: a constraint única do
    // banco (User.steamId) é a garantia final → trata como conflito.
    if (err instanceof Error && (err as { code?: string }).code === "P2002") {
      return fail(appUrl, "steam_ja_vinculado_outra_conta", sessionUserId ?? undefined);
    }
    logger.error(
      "[steam-link] Falha ao processar callback de vinculação",
      { source: "api/steam/link/callback GET", userId: sessionUserId ?? undefined },
      err
    );
    return fail(appUrl, "erro_interno", sessionUserId ?? undefined);
  }

  if (!result.ok) {
    // Sessão expirou no meio do fluxo → pedir login de novo (callbackUrl /profile).
    if (result.reason === "sessao_expirada") {
      const res = NextResponse.redirect(`${appUrl}/login?callbackUrl=%2Fprofile`, 302);
      return clearStateCookie(res);
    }
    return fail(appUrl, result.reason, sessionUserId ?? undefined);
  }

  // ── Sucesso: vínculo persistido → volta ao perfil com aviso ──
  const response = NextResponse.redirect(`${appUrl}/profile?success=steam_vinculado`, 302);
  clearStateCookie(response);
  logger.info("[steam-link] Conta Steam vinculada", {
    source: "api/steam/link/callback GET",
    userId: sessionUserId ?? undefined,
    data: { steamId: result.steamId },
  });
  return response;
}

/** Consome o state de uso único (sempre que o fluxo termina, certo ou errado). */
function clearStateCookie(response: NextResponse): NextResponse {
  response.cookies.set(LINK_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getUseSecureCookies(),
    path: LINK_STATE_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}

function fail(appUrl: string, reason: string, userId?: string) {
  logger.warn(`[steam-link] Vinculação rejeitada (${reason})`, {
    source: "api/steam/link/callback GET",
    userId,
    data: { reason },
  });
  return clearStateCookie(NextResponse.redirect(`${appUrl}/profile?error=steam_link_${reason}`, 302));
}
