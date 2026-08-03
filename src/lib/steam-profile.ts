import { cacheGet, cacheSet } from "./cache";

/**
 * Steam Web API — perfil público (ISteamUser/GetPlayerSummaries).
 *
 * Usada APENAS no backend para enriquecer o usuário com nome/avatar/URL do
 * perfil. A chave STEAM_API_KEY nunca chega ao navegador.
 *
 * Regras:
 *  - Falha (timeout, rate limit, perfil privado, resposta incompleta) retorna
 *    null e NUNCA invalida um login OpenID já verificado.
 *  - Nome/avatar NUNCA são usados como identidade (a identidade é o SteamID64).
 *  - Respostas são cacheadas por 1h (padrão de cache do projeto).
 */

const STEAM_API_BASE = "https://api.steampowered.com";
const PROFILE_TIMEOUT_MS = 5000;
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000;

export interface SteamProfile {
  steamId: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

interface GetPlayerSummariesResponse {
  response?: {
    players?: Array<{
      steamid?: unknown;
      personaname?: unknown;
      avatarfull?: unknown;
      profileurl?: unknown;
    }>;
  };
}

function sanitizeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function fetchSteamProfile(steamId64: string): Promise<SteamProfile | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `steam:profile:${steamId64}`;
  const cached = cacheGet<SteamProfile>(cacheKey);
  if (cached) return cached;

  try {
    const url =
      `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/` +
      `?key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(steamId64)}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "GameNexusApp/1.0 (login Steam)" },
      signal: AbortSignal.timeout(PROFILE_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data: GetPlayerSummariesResponse = await response.json();
    const player = data.response?.players?.[0];

    // Só aceita se a Steam confirmar o mesmo SteamID (dados externos não confiáveis)
    if (!player || player.steamid !== steamId64) return null;

    const profile: SteamProfile = {
      steamId: steamId64,
      displayName: sanitizeString(player.personaname),
      avatarUrl: sanitizeString(player.avatarfull),
      profileUrl: sanitizeString(player.profileurl),
    };

    cacheSet(cacheKey, profile, PROFILE_CACHE_TTL_MS);
    return profile;
  } catch {
    // Timeout / rede / JSON inválido: login continua sem perfil
    return null;
  }
}
