import { searchSteamGames } from "@/lib/steam";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";

/**
 * GET /api/games/search?query=dark+souls
 *
 * Busca jogos na Steam Store por nome.
 * Usado pelo autocomplete no formulário de adicionar jogo.
 * Retorna no máximo 8 resultados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return apiError("Mínimo de 3 caracteres para busca.", "VALIDATION_ERROR");
    }

    if (query.trim().length > 100) {
      return apiError("Busca muito longa (máx. 100 caracteres).", "VALIDATION_ERROR");
    }

    const results = await searchSteamGames(query);

    return apiSuccess({ results, total: results.length });
  } catch (error: any) {
    if (error.message?.includes("Limite de consultas")) {
      return apiError(error.message, "RATE_LIMITED");
    }
    return handleApiError(error, "api/games/search GET");
  }
}
