import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchOwnedGames,
  syncSteamLibrary,
  getUserLibraryMeta,
} from "@/lib/steam-library";
import { prisma } from "@/lib/prisma";
import type { SteamOwnedGame, User } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    steamOwnedGame: {
      findMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn(),
  },
}));

// Rate limit isolado (a unidade testada é o serviço, não o limiter)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
  getRateLimitKey: vi.fn().mockReturnValue("ratelimit:test"),
}));

const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedTransaction = vi.mocked(prisma.$transaction);
const mockedFindMany = vi.mocked(prisma.steamOwnedGame.findMany);
const mockedDeleteMany = vi.mocked(prisma.steamOwnedGame.deleteMany);
const mockedCreateMany = vi.mocked(prisma.steamOwnedGame.createMany);
const mockedUserUpdate = vi.mocked(prisma.user.update);

// Os mocks retornam apenas os campos consultados (cast explícito aos testes)
function mockFindUnique(value: unknown) {
  mockedFindUnique.mockResolvedValue(value as unknown as User);
}

function mockFindManyOwned(value: unknown) {
  mockedFindMany.mockResolvedValue(value as unknown as SteamOwnedGame[]);
}

const ORIGINAL_ENV = { ...process.env };

function ownedResponse(games: Array<{ appid: number; playtime_forever?: number; rt_last_played?: number }>) {
  return {
    response: { game_count: games.length, games },
  };
}

/** Retorna um objeto Response-like com o corpo JSON dado. */
function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.STEAM_API_KEY = "test-api-key";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOwnedGames", () => {
  it("extrai a biblioteca com appIds como STRING (nunca number)", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        ownedResponse([
          { appid: 730, playtime_forever: 12345, rt_last_played: 1700000000 },
          { appid: 570, playtime_forever: 0, rt_last_played: 0 },
        ])
      )
    );

    const result = await fetchOwnedGames("76561198000000001", { fetcher: fetcher as unknown as typeof fetch });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gameCount).toBe(2);
    expect(result.games[0].steamAppId).toBe("730");
    expect(typeof result.games[0].steamAppId).toBe("string");
    expect(result.games[0].playtimeForever).toBe(12345);
    expect(result.games[0].lastPlayedAt).toBeInstanceOf(Date);
    expect(result.games[1].lastPlayedAt).toBeNull();
  });

  it("aceita biblioteca vazia (pública, sem jogos)", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ response: { game_count: 0, games: [] } }));
    const result = await fetchOwnedGames("76561198000000002", { fetcher: fetcher as unknown as typeof fetch });
    expect(result).toEqual({ ok: true, games: [], gameCount: 0 });
  });

  it("detecta perfil privado (response vazio, sem game_count)", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ response: {} }));
    const result = await fetchOwnedGames("76561198000000003", { fetcher: fetcher as unknown as typeof fetch });
    expect(result).toEqual({ ok: false, code: "perfil_privado" });
  });

  it("trata HTTP 401/403 como perfil privado (acesso negado)", async () => {
    for (const status of [401, 403]) {
      const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, status));
      const result = await fetchOwnedGames(`7656119800000000${status}`, {
        fetcher: fetcher as unknown as typeof fetch,
      });
      expect(result).toEqual({ ok: false, code: "perfil_privado" });
    }
  });

  it("detecta rate limit da Steam (429)", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    const result = await fetchOwnedGames("76561198000000009", { fetcher: fetcher as unknown as typeof fetch });
    expect(result).toEqual({ ok: false, code: "rate_limit" });
  });

  it("trata falha de rede e HTTP 500 como api_falha", async () => {
    const network = vi.fn().mockRejectedValue(new Error("network down"));
    expect(
      await fetchOwnedGames("76561198000000010", { fetcher: network as unknown as typeof fetch })
    ).toEqual({ ok: false, code: "api_falha" });

    const serverError = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    expect(
      await fetchOwnedGames("76561198000000011", { fetcher: serverError as unknown as typeof fetch })
    ).toEqual({ ok: false, code: "api_falha" });
  });

  it("não chama a Steam sem STEAM_API_KEY", async () => {
    delete process.env.STEAM_API_KEY;
    const fetcher = vi.fn();
    const result = await fetchOwnedGames("76561198000000012", { fetcher: fetcher as unknown as typeof fetch });
    expect(result).toEqual({ ok: false, code: "sem_api_key" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("usa cache em memória: segunda chamada não consulta a Steam de novo", async () => {
    const steamId = "76561198000000013";
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(ownedResponse([{ appid: 730 }])));
    const f = fetcher as unknown as typeof fetch;

    const first = await fetchOwnedGames(steamId, { fetcher: f });
    const second = await fetchOwnedGames(steamId, { fetcher: f });

    expect(first.ok && second.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("syncSteamLibrary", () => {
  it("recusa usuário sem Steam vinculada (400)", async () => {
    mockFindUnique(null);
    const result = await syncSteamLibrary("user-1");
    expect(result).toEqual({ ok: false, status: 400, code: "sem_steam_vinculada" });
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it("persiste a biblioteca em transação (deleteMany + createMany + update) sem duplicação", async () => {
    mockFindUnique({ steamId: "76561198000000020" });
    mockedTransaction.mockResolvedValue([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(ownedResponse([
          { appid: 730, playtime_forever: 100 },
          { appid: 570 },
        ]))
      )
    );

    const result = await syncSteamLibrary("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ownedCount).toBe(2);
    expect(result.lastLibrarySyncAt).toBeInstanceOf(Date);

    // A transação recebe as 3 operações (substituição completa — nunca duplica)
    expect(mockedTransaction).toHaveBeenCalledTimes(1);
    expect(mockedTransaction.mock.calls[0]![0]).toHaveLength(3);

    const [delArgs] = mockedDeleteMany.mock.calls[0] as unknown as [{ where: { userId: string } }];
    expect(delArgs.where).toEqual({ userId: "user-1" });

    const [createArgs] = mockedCreateMany.mock.calls[0] as unknown as [
      { data: Array<Record<string, unknown>> },
    ];
    expect(createArgs.data).toHaveLength(2);
    expect(createArgs.data[0]).toMatchObject({ userId: "user-1", steamAppId: "730", playtimeForever: 100 });
    expect(createArgs.data[1].steamAppId).toBe("570");

    const [updArgs] = mockedUserUpdate.mock.calls[0] as unknown as [
      { where: { id: string }; data: { lastLibrarySyncAt: Date } },
    ];
    expect(updArgs.where).toEqual({ id: "user-1" });
    expect(updArgs.data.lastLibrarySyncAt).toBeInstanceOf(Date);
  });

  it("propaga perfil privado como 403", async () => {
    mockFindUnique({ steamId: "76561198000000021" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ response: {} })));

    const result = await syncSteamLibrary("user-1");
    expect(result).toEqual({ ok: false, status: 403, code: "perfil_privado" });
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
});

describe("getUserLibraryMeta", () => {
  it("retorna steamLinked=false e listas vazias para quem não tem Steam", async () => {
    mockFindUnique({ steamId: null, lastLibrarySyncAt: null });
    mockFindManyOwned([]);

    const meta = await getUserLibraryMeta("user-1");
    expect(meta).toEqual({
      steamLinked: false,
      ownedAppIds: [],
      ownedCount: null,
      lastLibrarySyncAt: null,
    });
  });

  it("retorna appIds + contagem + data da última sync", async () => {
    mockFindUnique({
      steamId: "76561198000000022",
      lastLibrarySyncAt: new Date("2026-08-05T10:00:00Z"),
    });
    mockFindManyOwned([{ steamAppId: "730" }, { steamAppId: "570" }]);

    const meta = await getUserLibraryMeta("user-1");
    expect(meta.steamLinked).toBe(true);
    expect(meta.ownedAppIds).toEqual(["730", "570"]);
    expect(meta.ownedCount).toBe(2);
    expect(meta.lastLibrarySyncAt).toEqual(new Date("2026-08-05T10:00:00Z"));
  });

  it("ownedCount fica null enquanto nunca sincronizou (mesmo com Steam vinculada)", async () => {
    mockFindUnique({ steamId: "76561198000000023", lastLibrarySyncAt: null });
    mockFindManyOwned([]);

    const meta = await getUserLibraryMeta("user-1");
    expect(meta.steamLinked).toBe(true);
    expect(meta.ownedCount).toBeNull();
  });
});
