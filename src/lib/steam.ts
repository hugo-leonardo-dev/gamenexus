import { checkRateLimit, getRateLimitKey } from "./rate-limit";
import { cacheGet, cacheSet, getSteamCacheKey, STEAM_CACHE_TTL } from "./cache";

/**
 * Extrai o appId de um link da Steam.
 */
export function extractSteamAppId(url: string): string | null {
  const match = url.match(/\/app\/(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Interface do retorno da Steam API (appdetails).
 */
interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name: string;
      header_image: string;
      is_free: boolean;
      release_date?: {
        coming_soon: boolean;
        date: string;
      };
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
      };
    };
  };
}

/**
 * Interface do retorno da Steam Reviews API.
 */
interface SteamReviewsResponse {
  success: number;
  query_summary?: {
    num_reviews: number;
    review_score: number; // 0-100 percentual
    review_score_desc: string; // "Overwhelmingly Positive"
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
}

/**
 * Interface do retorno da Steam Current Players API.
 */
interface SteamPlayersResponse {
  response?: {
    player_count: number;
    result: number;
  };
}

/**
 * Resultado do parsing de um jogo da Steam.
 */
export interface SteamGameData {
  steamAppId: string;
  title: string;
  imageUrl: string;
  isReleased: boolean;
  releaseDate: Date | null;
  originalPrice: number | null;
  currentPrice: number | null;
  discountPercent: number;
  // Novos campos
  reviewScore: number | null;      // Percentual positivo (0-100)
  reviewSummary: string | null;    // "Overwhelmingly Positive"
  currentPlayers: number | null;   // Jogando agora
  peak24h: number | null;          // Pico 24h (não disponível pela API gratuita, deixamos null)
}

// ─── Steam Store Search API ─────────────────────────────────────────────

type SteamSearchPrice =
  | string
  | { currency: string; initial: number; final: number; discount_percent?: number };

interface SteamSearchItem {
  id: number;
  name: string;
  tiny_image: string;
  price?: SteamSearchPrice;
  release_date?: string;
  metacritic_score?: string;
}

export interface SteamSearchResult {
  appId: string;
  name: string;
  imageUrl: string;
  price: string | null;
  releaseYear: string | null;
}

function formatSteamPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function parseSteamSearchPrice(price: SteamSearchPrice | undefined): string | null {
  if (!price) return null;
  if (typeof price === "string") return price;
  if (price.final === 0) return "Grátis";
  return formatSteamPrice(price.final);
}

export async function searchSteamGames(query: string): Promise<SteamSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `steam:search:${query.trim().toLowerCase()}`;
  const cached = cacheGet<SteamSearchResult[]>(cacheKey);
  if (cached) return cached;

  const { allowed, retryAfterMs } = checkRateLimit(getRateLimitKey("steam-api"));
  if (!allowed) {
    throw new Error(
      `Limite de consultas excedido. Tente novamente em ${Math.ceil(retryAfterMs / 1000)}s.`
    );
  }

  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query.trim())}&cc=br&l=pt-BR`;

  const response = await fetch(url, {      headers: { "User-Agent": "GameNexusApp/1.0 (busca de jogos)" },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar jogos: ${response.status}`);
  }

  const data: { items?: SteamSearchItem[]; total?: number } = await response.json();

  if (!data.items || data.items.length === 0) return [];

  const results: SteamSearchResult[] = data.items.slice(0, 8).map((item) => ({
    appId: String(item.id),
    name: item.name,
    imageUrl: item.tiny_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/capsule_184x69.jpg`,
    price: parseSteamSearchPrice(item.price),
    releaseYear: item.release_date ? extractYear(item.release_date) : null,
  }));

  cacheSet(cacheKey, results, 30 * 60 * 1000);
  return results;
}

function extractYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : null;
}

// ─── Fetch de reviews ───────────────────────────────────────────────────

async function fetchSteamReviews(appId: string): Promise<{ score: number | null; summary: string | null }> {
  try {
    const url = `https://store.steampowered.com/appreviews/${appId}?json=1&filter=summary&language=all&num_per_page=0`;
    const response = await fetch(url, {
      headers: { "User-Agent": "GameNexusApp/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return { score: null, summary: null };

    const data: SteamReviewsResponse = await response.json();
    if (data.success !== 1 || !data.query_summary) {
      return { score: null, summary: null };
    }

    // Calcula percentual positivo
    const total = data.query_summary.total_positive + data.query_summary.total_negative;
    const score = total > 0
      ? Math.round((data.query_summary.total_positive / total) * 100)
      : null;

    return {
      score,
      summary: data.query_summary.review_score_desc || null,
    };
  } catch {
    return { score: null, summary: null };
  }
}

// ─── Fetch de jogadores atuais ─────────────────────────────────────────

export async function fetchCurrentPlayers(appId: string): Promise<number | null> {
  try {
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "GameNexusApp/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data: SteamPlayersResponse = await response.json();
    return data.response?.player_count ?? null;
  } catch {
    return null;
  }
}

// ─── Fetch completo dos dados do jogo ──────────────────────────────────

export async function fetchSteamGameData(
  appId: string
): Promise<SteamGameData> {
  // 1. Verifica cache primeiro
  const cacheKey = getSteamCacheKey(appId);
  const cached = cacheGet<SteamGameData>(cacheKey);
  if (cached) return cached;

  // 2. Rate limiting
  const { allowed, retryAfterMs } = checkRateLimit(getRateLimitKey("steam-api"));
  if (!allowed) {
    throw new Error(
      `Limite de consultas à Steam excedido. Tente novamente em ${Math.ceil(retryAfterMs / 1000)} segundos.`
    );
  }

  // 3. Fetch dados básicos + reviews + players em paralelo
  const [detailsResponse, reviewsData, playersCount] = await Promise.all([
    fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&l=portuguese`,
      { headers: { "User-Agent": "GameNexusApp/1.0 (grupo colaborativo de jogos)" } }
    ),
    fetchSteamReviews(appId),
    fetchCurrentPlayers(appId),
  ]);

  if (!detailsResponse.ok) {
    throw new Error(
      `Erro ao consultar Steam API: ${detailsResponse.status} ${detailsResponse.statusText}`
    );
  }

  const data: SteamAppDetailsResponse = await detailsResponse.json();
  const game = data[appId];

  if (!game?.success || !game.data) {
    throw new Error("Jogo não encontrado na Steam. Verifique o link.");
  }

  const info = game.data;

  // Processa release date
  let isReleased = true;
  let releaseDate: Date | null = null;

  if (info.release_date) {
    isReleased = !info.release_date.coming_soon;
    if (info.release_date.date) {
      const parsed = new Date(info.release_date.date);
      if (!isNaN(parsed.getTime())) {
        releaseDate = parsed;
      }
    }
  }

  // Processa preços (valores em centavos)
  let originalPrice: number | null = null;
  let currentPrice: number | null = null;
  let discountPercent = 0;

  if (info.is_free) {
    originalPrice = 0;
    currentPrice = 0;
  } else if (info.price_overview) {
    originalPrice = info.price_overview.initial;
    currentPrice = info.price_overview.final;
    discountPercent = info.price_overview.discount_percent;
  }

  const gameData: SteamGameData = {
    steamAppId: appId,
    title: info.name,
    imageUrl: info.header_image,
    isReleased,
    releaseDate,
    originalPrice,
    currentPrice,
    discountPercent,
    reviewScore: reviewsData.score,
    reviewSummary: reviewsData.summary,
    currentPlayers: playersCount,
    peak24h: null, // Não disponível via API pública gratuita
  };

  // 4. Armazena em cache por 1 hora
  cacheSet(cacheKey, gameData, STEAM_CACHE_TTL);

  return gameData;
}
