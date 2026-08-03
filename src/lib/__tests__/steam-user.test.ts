import { describe, it, expect, beforeEach, vi } from "vitest";
import { upsertSteamUser } from "@/lib/steam-user";
import { prisma } from "@/lib/prisma";
import type { SteamProfile } from "@/lib/steam-profile";
import type { User } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}));

const mockedUpsert = vi.mocked(prisma.user.upsert);

const PROFILE: SteamProfile = {
  steamId: "76561198000000000",
  displayName: "GabeN",
  avatarUrl: "https://avatars.akamai.steamstatic.com/x_full.jpg",
  profileUrl: "https://steamcommunity.com/id/gaben/",
};

/** Retorna o único argumento (args do upsert) da última chamada. */
function lastUpsertArgs() {
  const calls = mockedUpsert.mock.calls;
  return calls[calls.length - 1]![0]!;
}

const FAKE_USER: User = {
  id: "user-1",
  discordId: null,
  steamId: PROFILE.steamId,
  name: PROFILE.displayName ?? "Steam User",
  email: null,
  emailVerified: null,
  avatarUrl: PROFILE.avatarUrl,
  passwordHash: null,
  steamName: PROFILE.displayName,
  steamAvatarUrl: PROFILE.avatarUrl,
  steamProfileUrl: PROFILE.profileUrl,
  steamLinkedAt: null,
  lastLibrarySyncAt: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedUpsert.mockResolvedValue(FAKE_USER);
});

describe("upsertSteamUser", () => {
  it("cria usuário com SteamID64 como string (nunca number)", async () => {
    await upsertSteamUser("76561198000000000", PROFILE);
    const args = lastUpsertArgs();

    expect(args.create.steamId).toBe("76561198000000000");
    expect(typeof args.create.steamId).toBe("string");
  });

  it("cria usuário com dados do perfil Steam", async () => {
    await upsertSteamUser("76561198000000000", PROFILE);
    const args = lastUpsertArgs();

    expect(args.where).toEqual({ steamId: "76561198000000000" });
    expect(args.create.name).toBe("GabeN");
    expect(args.create.avatarUrl).toBe(PROFILE.avatarUrl);
    expect(args.create.steamName).toBe("GabeN");
    expect(args.create.steamAvatarUrl).toBe(PROFILE.avatarUrl);
    expect(args.create.steamProfileUrl).toBe(PROFILE.profileUrl);
    expect(args.create.lastLoginAt).toBeInstanceOf(Date);
  });

  it("cria usuário com fallback quando não há perfil", async () => {
    await upsertSteamUser("76561198000000000", null);
    const args = lastUpsertArgs();

    expect(args.create.name).toBe("Steam User");
    expect(args.create.avatarUrl).toBeNull();
    expect(args.create.steamName).toBeNull();
  });

  it("em login existente NÃO sobrescreve name/avatarUrl customizados", async () => {
    await upsertSteamUser("76561198000000000", PROFILE);
    const args = lastUpsertArgs();

    expect(args.update).not.toHaveProperty("name");
    expect(args.update).not.toHaveProperty("avatarUrl");
  });

  it("em login existente atualiza apenas campos steam* + lastLoginAt", async () => {
    await upsertSteamUser("76561198000000000", PROFILE);
    const args = lastUpsertArgs();

    expect(args.update.steamName).toBe("GabeN");
    expect(args.update.steamAvatarUrl).toBe(PROFILE.avatarUrl);
    expect(args.update.steamProfileUrl).toBe(PROFILE.profileUrl);
    expect(args.update.lastLoginAt).toBeInstanceOf(Date);
  });

  it("sem perfil disponível mantém campos steam* anteriores (undefined = sem alteração)", async () => {
    await upsertSteamUser("76561198000000000", null);
    const args = lastUpsertArgs();

    expect(args.update).not.toHaveProperty("steamName");
    expect(args.update).not.toHaveProperty("steamAvatarUrl");
    expect(args.update).not.toHaveProperty("steamProfileUrl");
    expect(args.update.lastLoginAt).toBeInstanceOf(Date);
  });

  it("é idempotente: sempre upsert por steamId único (nunca duplica)", async () => {
    await upsertSteamUser("76561198000000000", PROFILE);
    await upsertSteamUser("76561198000000000", PROFILE);

    expect(mockedUpsert).toHaveBeenCalledTimes(2);
    for (const [args] of mockedUpsert.mock.calls) {
      expect(args!.where).toEqual({ steamId: "76561198000000000" });
    }
  });
});
