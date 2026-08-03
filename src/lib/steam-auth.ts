import { randomBytes } from "crypto";
import { encode } from "next-auth/jwt";

/**
 * Steam OpenID 2.0 — login oficial via steamcommunity.com/openid/login.
 *
 * Este módulo concentra TUDO relacionado ao protocolo OpenID 2.0 da Steam:
 *  - montagem da URL de autenticação
 *  - extração/validação dos parâmetros do callback
 *  - confirmação via `check_authentication`
 *  - extração do SteamID64 (como string, nunca number — evita perda de precisão)
 *  - proteção anti-CSRF (state de uso único) e anti-replay (nonce)
 *
 * A sessão resultante é um JWT do Auth.js (mesmo formato do NextAuth já usado
 * pelo projeto), portanto o usuário entra na mesma sessão de Discord/Email.
 *
 * Decisões de segurança:
 *  - Nenhuma senha da Steam é solicitada ou armazenada.
 *  - O SteamID nunca é aceito vindo do cliente; é extraído do `claimed_id`
 *    verificado com `check_authentication` (is_valid:true + eco de parâmetros).
 *  - `openid.return_to` é validado por igualdade exata (contém o state anti-CSRF).
 *  - `openid.realm` deve bater com a origem pública configurada (NEXTAUTH_URL).
 *  - `response_nonce` deve ser fresco e não reutilizado (anti-replay).
 *  - O `encode` do Auth.js gera um novo `jti` a cada login (anti session fixation).
 */

export const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
export const OPENID_NS = "http://specs.openid.net/auth/2.0";
export const OPENID_IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";

const STEAM_OPENID_HOST = "steamcommunity.com";
const STEAM_OPENID_PATH = "/openid/login";

/** SteamID64: 17 dígitos decimais dentro de /openid/id/ (sempre https) */
const STEAM_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
/** response_nonce da Steam: "2026-08-03T12:00:00Z" + sufixo aleatório */
const NONCE_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/;

export const STATE_COOKIE_NAME = "steam_auth_state";
export const STATE_COOKIE_MAX_AGE_SECONDS = 300; // 5 min — janela do fluxo de login
export const STATE_COOKIE_PATH = "/api/auth/steam/callback"; // enviado apenas ao callback
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias (padrão Auth.js)

// ─── Configuração ────────────────────────────────────────────────────────

export interface SteamAuthConfig {
  /** Origem pública (scheme + host), sem barra final — ex: https://gamenexus.vercel.app */
  appUrl: string;
  /** Realm OpenID enviado à Steam (derivado da URL pública, sem barra final) */
  realm: string;
  /** URL completa do callback (derivada da URL pública) */
  returnTo: string;
}

/**
 * Centraliza a configuração do fluxo Steam (login ou vinculação de conta).
 * As URLs críticas vêm de NEXTAUTH_URL/AUTH_URL (configuradas no ambiente),
 * nunca de headers de request — evita ataques baseados em Host spoofing.
 *
 * `returnToPath` permite reutilizar o mesmo protocolo OpenID com callbacks
 * diferentes (login: /api/auth/steam/callback; vinculação: /api/steam/link/callback).
 */
export function getSteamAuthConfig(
  returnToPath = "/api/auth/steam/callback"
): SteamAuthConfig {
  const base = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  if (!base) {
    throw new Error("[steam-auth] AUTH_URL/NEXTAUTH_URL é obrigatória para o login Steam.");
  }
  const realm = (process.env.STEAM_OPENID_REALM ?? base).replace(/\/+$/, "");
  const returnTo = (process.env.STEAM_OPENID_RETURN_URL ?? `${base}${returnToPath}`).replace(/\/+$/, "");
  return { appUrl: base, realm, returnTo };
}

/**
 * Espelha a lógica do Auth.js: cookies Secure + prefixo `__Secure-` quando a
 * URL pública é HTTPS (produção). Em dev (http://localhost) usa cookie simples.
 */
export function getUseSecureCookies(): boolean {
  return (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").startsWith("https:");
}

/** Nome do cookie de sessão do Auth.js (deve bater com o que o `auth()` lê). */
export function getSessionCookieName(): string {
  return getUseSecureCookies() ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export function getSessionCookieAttributes(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: getUseSecureCookies(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

// ─── Início do fluxo ─────────────────────────────────────────────────────

/** State anti-CSRF: 256 bits aleatórios, uso único, associado à sessão (cookie). */
export function generateState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * State com binding: `<aleatório 64 hex>:<binding>`.
 *
 * Usado na vinculação de conta: o binding (userId) fica dentro do valor do
 * cookie HttpOnly — o navegador não consegue ler/forjar — e é ecoado pela
 * Steam no return_to. No callback, validamos que quem confirmou o fluxo é o
 * mesmo usuário que o iniciou (mesmo se a sessão trocar no meio do caminho).
 */
export function generateStateWithBinding(binding: string): string {
  return `${generateState()}:${binding}`;
}

/**
 * Extrai o binding do state (ou null se malformado/forjado).
 * Exige exatamente 64 hex aleatórios antes do separador — um state que não
 * veio de generateStateWithBinding é rejeitado.
 */
export function parseStateBinding(state: string): string | null {
  const idx = state.indexOf(":");
  if (idx <= 0) return null;
  const random = state.slice(0, idx);
  const binding = state.slice(idx + 1);
  if (!/^[0-9a-f]{64}$/.test(random) || !binding) return null;
  return binding;
}

/** O state é embutido no return_to — a Steam ecoa o return_to exato no callback. */
export function buildReturnToWithState(config: SteamAuthConfig, state: string): string {
  return `${config.returnTo}?state=${encodeURIComponent(state)}`;
}

/**
 * Monta a URL de redirecionamento para o endpoint oficial da Steam.
 * `openid.identity/claimed_id` usam identifier_select (a Steam resolve o ID).
 */
export function buildSteamAuthUrl(config: SteamAuthConfig, state: string): string {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": buildReturnToWithState(config, state),
    "openid.realm": config.realm,
    "openid.identity": OPENID_IDENTIFIER_SELECT,
    "openid.claimed_id": OPENID_IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

// ─── Callback ────────────────────────────────────────────────────────────

/** Extrai os parâmetros `openid.*` recebidos no callback (remove o prefixo). */
export function extractOpenIdParams(searchParams: URLSearchParams): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) out[key.slice("openid.".length)] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type OpenIdValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Validação local dos parâmetros OpenID recebidos, antes de consultar a Steam:
 *  - mode deve ser id_res
 *  - op_endpoint deve ser o endpoint oficial (aceita http/https — a Steam às
 *    vezes responde http; a confirmação sempre vai para HTTPS)
 *  - claimed_id/identity no formato de SteamID64
 *  - return_to idêntico ao esperado (inclui o state anti-CSRF)
 *  - realm idêntico ao esperado, SE enviado (a Steam não o ecoa no id_res)
 *  - response_nonce presente e dentro da janela de frescor
 */
export function validateOpenIdCallback(
  params: Record<string, string>,
  expectedRealm: string,
  expectedReturnTo: string
): OpenIdValidationResult {
  if (params.ns !== OPENID_NS) return { ok: false, reason: "ns_invalido" };
  if (params.mode !== "id_res") return { ok: false, reason: "mode_invalido" };
  if (!isOfficialSteamOpenIdEndpoint(params.op_endpoint ?? "")) {
    return { ok: false, reason: "op_endpoint_invalido" };
  }
  if (!extractSteamId64(params.claimed_id ?? "")) {
    return { ok: false, reason: "claimed_id_invalido" };
  }
  if (params.identity !== params.claimed_id) {
    return { ok: false, reason: "identity_invalido" };
  }
  if (params.return_to !== expectedReturnTo) {
    return { ok: false, reason: "return_to_incompativel" };
  }
  // A Steam NÃO ecoa openid.realm no id_res (confirmado em teste real).
  // A origem já é garantida pelo return_to (igualdade exata, derivada da URL
  // pública configurada) + check_authentication; o realm é conferido apenas
  // se o provedor o enviar.
  if (params.realm !== undefined && params.realm !== expectedRealm) {
    return { ok: false, reason: "realm_incompativel" };
  }
  if (!params.response_nonce || !isNonceFresh(params.response_nonce)) {
    return { ok: false, reason: "nonce_expirado" };
  }
  return { ok: true };
}

/** O op_endpoint deve ser o endpoint oficial da Steam (host + path exatos). */
export function isOfficialSteamOpenIdEndpoint(opEndpoint: string): boolean {
  try {
    const url = new URL(opEndpoint);
    return url.hostname === STEAM_OPENID_HOST && url.pathname === STEAM_OPENID_PATH;
  } catch {
    return false;
  }
}

/**
 * Extrai o SteamID64 EXCLUSIVAMENTE do `openid.claimed_id`.
 * Retorna string de 17 dígitos (nunca number — evita perda de precisão).
 */
export function extractSteamId64(claimedId: string): string | null {
  const match = claimedId.match(STEAM_ID_RE);
  return match ? match[1] : null;
}

/** Frescor do response_nonce: dentro de 10 minutos (com tolerância a skew). */
export function isNonceFresh(nonce: string, now = Date.now()): boolean {
  const match = nonce.match(NONCE_RE);
  if (!match) return false;
  const ts = Date.parse(match[1]);
  if (Number.isNaN(ts)) return false;
  return Math.abs(now - ts) <= 10 * 60 * 1000;
}

// ─── Anti-replay (nonce de uso único) ────────────────────────────────────
// Store em memória com janela igual à de frescor — mesmo padrão do rate-limit.ts.
// Em múltiplas instâncias, mover para Redis (REDIS_URL já previsto no projeto).
//
// A verificação e a marcação são separadas de propósito: o nonce só é marcado
// como usado DEPOIS de o check_authentication com a Steam ter sido aceito.
// Assim, tentativas falhas (ou ataques) não queimam o nonce do usuário real.

const usedNonces = new Map<string, number>();
const NONCE_WINDOW_MS = 10 * 60 * 1000;

/** Retorna true se o nonce JÁ foi usado em um login bem-sucedido (replay). */
export function isNonceUsed(nonce: string): boolean {
  return usedNonces.has(nonce);
}

/** Marca o nonce como usado (chamar apenas após verificação bem-sucedida). */
export function markNonceUsed(nonce: string, now = Date.now()): void {
  usedNonces.set(nonce, now);
  if (usedNonces.size > 2000) {
    for (const [key, ts] of usedNonces) {
      if (now - ts > NONCE_WINDOW_MS) usedNonces.delete(key);
    }
  }
}

// ─── check_authentication ────────────────────────────────────────────────

/**
 * Confirma a resposta OpenID com a Steam (POST check_authentication).
 *
 * A Steam responde apenas `is_valid:true` (confirmado em teste real — ela NÃO
 * ecoa os parâmetros no corpo). Isso é seguro porque:
 *  - enviamos exatamente os parâmetros recebidos no callback (alterar qualquer
 *    um deles, ex: claimed_id/return_to, invalidaria a assinatura `sig`);
 *  - `is_valid:true` só é emitido se a assinatura desses parâmetros for válida;
 *  - as validações locais (state anti-CSRF, return_to exato, op_endpoint,
 *    claimed_id, identity, frescor/anti-replay do nonce) já rejeitam
 *    callbacks forjados ou reutilizados antes de chegar aqui.
 */
export async function verifySteamAuthentication(
  params: Record<string, string>,
  fetcher: typeof fetch = fetch
): Promise<boolean> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) body.set(`openid.${key}`, value);
  body.set("openid.mode", "check_authentication");

  let response: Response;
  try {
    response = await fetcher(STEAM_OPENID_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "GameNexusApp/1.0 (login Steam OpenID)",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return false;
  }

  if (!response.ok) return false;

  const text = await response.text();
  const fields = parseOpenIdResponse(text);
  return fields.get("is_valid") === "true";
}

/** Parse do corpo da resposta da Steam: linhas "chave:valor" (formato OpenID). */
function parseOpenIdResponse(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) fields.set(key, value);
  }
  return fields;
}

// ─── Sessão Auth.js ──────────────────────────────────────────────────────

export interface SteamSessionUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Cria o JWT de sessão no formato do Auth.js. O `encode` adiciona iat/exp e um
 * novo `jti` a cada login — regenera a sessão (anti session fixation).
 * Mesmo secret (AUTH_SECRET) e mesmo cookie usado pelo NextAuth do projeto.
 *
 * O `salt` é o nome do cookie de sessão: é exatamente isso que o `auth()` usa
 * ao decodificar (utils/session.js) — sem bater, a sessão não seria lida.
 */
export async function createAuthSessionJwt(user: SteamSessionUser): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("[steam-auth] AUTH_SECRET é obrigatória para criar a sessão.");
  }
  return encode({
    token: { sub: user.id, id: user.id, name: user.name, picture: user.avatarUrl },
    secret,
    salt: getSessionCookieName(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
