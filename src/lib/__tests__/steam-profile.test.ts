import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchSteamProfile } from "@/lib/steam-profile";

const ORIGINAL_ENV = { ...process.env };

function mockFetchResponse(data: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  } as Response;
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.STEAM_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// IDs únicos por teste: o cache em memória do projeto persiste entre testes
// do mesmo worker (mesmo comportamento em runtime).
const ID_VALIDO = "76561198000000000";
const ID_MISMATCH = "76561198000000001";
const ID_PRIVADO = "76561198000000002";
const ID_INCOMPLETO = "76561198000000003";
const ID_HTTP_ERROR = "76561198000000004";
const ID_REDE = "76561198000000005";
const ID_CACHE = "76561198000000006";
const ID_ESTRANHO = "76561198000000007";

describe("fetchSteamProfile", () => {
  it("retorna null sem STEAM_API_KEY", async () => {
    delete process.env.STEAM_API_KEY;
    expect(await fetchSteamProfile(ID_VALIDO)).toBeNull();
  });

  it("retorna o perfil público com dados sanitizados", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        response: {
          players: [
            {
              steamid: ID_VALIDO,
              personaname: "GabeN",
              avatarfull: "https://avatars.akamai.steamstatic.com/x_full.jpg",
              profileurl: "https://steamcommunity.com/id/gaben/",
            },
          ],
        },
      })
    );

    const profile = await fetchSteamProfile(ID_VALIDO);
    expect(profile).toEqual({
      steamId: ID_VALIDO,
      displayName: "GabeN",
      avatarUrl: "https://avatars.akamai.steamstatic.com/x_full.jpg",
      profileUrl: "https://steamcommunity.com/id/gaben/",
    });
  });

  it("rejeita resposta cujo steamid não confere (dados não confiáveis)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        response: {
          players: [
            {
              steamid: ID_ESTRANHO,
              personaname: "Outro",
              avatarfull: null,
              profileurl: null,
            },
          ],
        },
      })
    );

    expect(await fetchSteamProfile(ID_MISMATCH)).toBeNull();
  });

  it("retorna null em perfil privado (players vazio)", async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ response: { players: [] } }));
    expect(await fetchSteamProfile(ID_PRIVADO)).toBeNull();
  });

  it("retorna null em resposta incompleta", async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({}));
    expect(await fetchSteamProfile(ID_INCOMPLETO)).toBeNull();
  });

  it("retorna null quando a API responde erro HTTP", async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({}, false));
    expect(await fetchSteamProfile(ID_HTTP_ERROR)).toBeNull();
  });

  it("retorna null em falha de rede — nunca lança", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
    expect(await fetchSteamProfile(ID_REDE)).toBeNull();
  });

  it("usa cache: segunda chamada não refaz o fetch", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        response: {
          players: [{ steamid: ID_CACHE, personaname: "Cache", avatarfull: null, profileurl: null }],
        },
      })
    );

    await fetchSteamProfile(ID_CACHE);
    await fetchSteamProfile(ID_CACHE);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
