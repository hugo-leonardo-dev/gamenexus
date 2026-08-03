import { prisma } from "./prisma";
import { checkRateLimit, getRateLimitKey } from "./rate-limit";
import { cacheGet, cacheSet } from "./cache";

/**
 * Steam Library — sincronização da biblioteca de jogos do usuário
 * (IPlayerService/GetOwnedGames) e matching com o Kanban.
 *
 * A "posse" de um jogo é relativa ao usuário LOGADO: dois membros do mesmo
 * grupo veem tags diferentes no mesmo card, cada um com base na própria
 * biblioteca. O matching é SEMPRE por `steamAppId` (nunca por nome).
 *
 * - Perfil privado / chave inválida → erro explícito (nunca genérico).
 * - Falha da API NUNCA quebra a página — o Kanban apenas não mostra tags.
 * - Biblioteca é cacheada 10 min em memória (muda raramente).
 * - `playtimeForever` já é persistido (reservado para Estatísticas futuras).
 */

const OWNED_API_BASE = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/";
const OWNED_TIMEOUT_MS = 10_000;
const OWNED_CACHE_TTL_MS = 10 * 60 * 1000;

export type LibraryErrorCode =
  | "sem_steam_vinculada"
  | "perfil_privado"
  | "rate_limit"
  | "api_falha"
  | "sem_api_key";

export interface OwnedGame {
  steamAppId: string;
  playtimeForever: number;
  lastPlayedAt: Date | null;
}

interface GetOwnedGamesResponse {
  response?: {
    game_count?: number;
    games?: Array<{
      appid?: unknown;
      playtime_forever?: unknown;
      rt_last_played?: unknown;
    }>;
  };
}

export type FetchOwnedResult =
  | { ok: true; games: OwnedGame[]; gameCount: number }
  | { ok: false; code: Exclude<LibraryErrorCode, "sem_steam_vinculada"> };

/**
 * Busca a biblioteca do usuário na Steam Web API.
 * `fetcher` é injetável para testes (nunca chamar a Steam real em testes).
 *
 * Detecção de perfil privado: a Steam retorna `response` vazio (sem
 * `game_count`) para perfis privados; perfis públicos sempre trazem
 * `game_count` (pode ser 0). HTTP 401/403 também indicam acesso negado.
 */
export async function fetchOwnedGames(
  steamId: string,
  deps: { fetcher?: typeof fetch } = {}
): Promise<FetchOwnedResult> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return { ok: false, code: "sem_api_key" };

  const cacheKey = `steam:owned:${steamId}`;
  const cached = cacheGet<OwnedGame[]>(cacheKey);
  if (cached) return { ok: true, games: cached, gameCount: cached.length };

  const { allowed } = checkRateLimit(getRateLimitKey("steam-api"));
  if (!allowed) return { ok: false, code: "rate_limit" };

  const url =
    `${OWNED_API_BASE}?key=${encodeURIComponent(apiKey)}` +
    `&steamid=${encodeURIComponent(steamId)}` +
    `&include_played_free_games=1&include_appinfo=1&format=json`;

  let response: Response;
  try {
    response = await (deps.fetcher ?? fetch)(url, {
      headers: { "User-Agent": "GameNexusApp/1.0 (sincronizacao de biblioteca)" },
      signal: AbortSignal.timeout(OWNED_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, code: "api_falha" };
  }

  // 401/403: perfil privado OU chave inválida — tratados da mesma forma
  // (sem expor ao usuário qual dos dois é, mantendo a mensagem honesta).
  if (response.status === 401 || response.status === 403) {
    return { ok: false, code: "perfil_privado" };
  }
  if (response.status === 429) return { ok: false, code: "rate_limit" };
  if (!response.ok) return { ok: false, code: "api_falha" };

  let data: GetOwnedGamesResponse;
  try {
    data = (await response.json()) as GetOwnedGamesResponse;
  } catch {
    return { ok: false, code: "api_falha" };
  }

  const resp = data.response;
  // Sem game_count → perfil privado (ou resposta inesperada); nunca assumir
  // "biblioteca vazia" nesse caso.
  if (!resp || typeof resp !== "object" || resp.game_count === undefined) {
    return { ok: false, code: "perfil_privado" };
  }

  const games: OwnedGame[] = (resp.games ?? [])
    .filter((g) => g.appid !== undefined)
    .map((g) => ({
      steamAppId: String(g.appid),
      playtimeForever: typeof g.playtime_forever === "number" ? g.playtime_forever : 0,
      lastPlayedAt:
        typeof g.rt_last_played === "number" && g.rt_last_played > 0
          ? new Date(g.rt_last_played * 1000)
          : null,
    }));

  cacheSet(cacheKey, games, OWNED_CACHE_TTL_MS);
  return { ok: true, games, gameCount: resp.game_count ?? games.length };
}

export type SyncResult =
  | { ok: true; ownedCount: number; lastLibrarySyncAt: Date }
  | { ok: false; status: 400 | 403 | 429 | 502; code: LibraryErrorCode };

/**
 * Sincroniza a biblioteca Steam do usuário (idempotente por construção):
 * substitui os jogos possuídos em uma transação (deleteMany + createMany),
 * garantindo zero duplicação mesmo com syncs repetidas/concorrentes.
 */
export async function syncSteamLibrary(userId: string): Promise<SyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user?.steamId) {
    return { ok: false, status: 400, code: "sem_steam_vinculada" };
  }

  const owned = await fetchOwnedGames(user.steamId);
  if (!owned.ok) {
    const status: 400 | 403 | 429 | 502 =
      owned.code === "perfil_privado" ? 403 : owned.code === "rate_limit" ? 429 : 502;
    return { ok: false, status, code: owned.code };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.steamOwnedGame.deleteMany({ where: { userId } }),
    prisma.steamOwnedGame.createMany({
      data: owned.games.map((g) => ({
        userId,
        steamAppId: g.steamAppId,
        playtimeForever: g.playtimeForever,
        lastPlayedAt: g.lastPlayedAt,
      })),
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastLibrarySyncAt: now },
    }),
  ]);

  return { ok: true, ownedCount: owned.games.length, lastLibrarySyncAt: now };
}

export interface UserLibraryMeta {
  /** Usuário tem Steam vinculada ao perfil? */
  steamLinked: boolean;
  /** appIds possuídos (base das tags "Já Possuo" e filtros) */
  ownedAppIds: string[];
  /** null enquanto nunca sincronizou; número de jogos após a 1ª sync */
  ownedCount: number | null;
  lastLibrarySyncAt: Date | null;
}

/** Meta de biblioteca para render server-side (Kanban, perfil, dashboard). */
export async function getUserLibraryMeta(userId: string): Promise<UserLibraryMeta> {
  const [user, owned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { steamId: true, lastLibrarySyncAt: true },
    }),
    prisma.steamOwnedGame.findMany({
      where: { userId },
      select: { steamAppId: true },
    }),
  ]);

  return {
    steamLinked: Boolean(user?.steamId),
    ownedAppIds: owned.map((g) => g.steamAppId),
    ownedCount: user?.lastLibrarySyncAt ? owned.length : null,
    lastLibrarySyncAt: user?.lastLibrarySyncAt ?? null,
  };
}
