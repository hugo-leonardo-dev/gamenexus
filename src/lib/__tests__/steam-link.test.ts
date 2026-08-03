import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  LINK_CALLBACK_PATH,
  buildLinkAuthUrl,
  linkSteamAccount,
  unlinkSteamAccount,
} from "@/lib/steam-link";
import {
  OPENID_NS,
  buildReturnToWithState,
  generateStateWithBinding,
  getSteamAuthConfig,
  markNonceUsed,
  parseStateBinding,
} from "@/lib/steam-auth";
import { prisma } from "@/lib/prisma";
import { fetchSteamProfile } from "@/lib/steam-profile";
import type { User } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/steam-profile", () => ({
  fetchSteamProfile: vi.fn(),
}));

const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedUpdate = vi.mocked(prisma.user.update);
const mockedFetchProfile = vi.mocked(fetchSteamProfile);

// Os mocks retornam apenas os campos que o serviço consulta; o cast para o
// tipo do Prisma é explícito e restrito aos testes (nunca em produção).
function mockFindUnique(
  impl: (args: { where: { steamId?: string; id?: string } }) => Promise<unknown>
) {
  mockedFindUnique.mockImplementation(impl as unknown as typeof prisma.user.findUnique);
}

function mockUpdateResolved(value: { id: string; steamId: string | null }) {
  mockedUpdate.mockResolvedValue(value as unknown as User);
}

const ORIGINAL_ENV = { ...process.env };

const STEAM_ID = "76561198000000000";
const SESSION_USER_ID = "user-1";

let nonceCounter = 0;

function freshNonce(): string {
  const iso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  nonceCounter += 1;
  return `${iso}${nonceCounter.toString(36).padStart(32, "0")}`;
}

function validLinkParams(state: string, overrides: Record<string, string> = {}) {
  const config = getSteamAuthConfig(LINK_CALLBACK_PATH);
  return {
    ns: OPENID_NS,
    mode: "id_res",
    op_endpoint: "https://steamcommunity.com/openid/login",
    claimed_id: `https://steamcommunity.com/openid/id/${STEAM_ID}`,
    identity: `https://steamcommunity.com/openid/id/${STEAM_ID}`,
    return_to: buildReturnToWithState(config, state),
    response_nonce: freshNonce(),
    assoc_handle: "1234567890",
    signed: "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    sig: "base64signature",
    ...overrides,
  };
}

function validFetcher() {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve("is_valid:true"),
  });
}

function boundState(userId = SESSION_USER_ID): string {
  return generateStateWithBinding(userId);
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.AUTH_SECRET = "test-secret-0123456789abcdef";

  vi.clearAllMocks();
  mockedFetchProfile.mockResolvedValue(null);
  mockUpdateResolved({ id: SESSION_USER_ID, steamId: STEAM_ID });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateStateWithBinding / parseStateBinding", () => {
  it("gera state no formato <64 hex>:<binding> e recupera o binding", () => {
    const state = generateStateWithBinding("user-42");
    expect(state).toMatch(/^[0-9a-f]{64}:[^:]+$/);
    expect(parseStateBinding(state)).toBe("user-42");
  });

  it("rejeita state sem separador (não veio do nosso gerador)", () => {
    expect(parseStateBinding("a".repeat(64))).toBeNull();
  });

  it("rejeita parte aleatória que não seja 64 hex", () => {
    expect(parseStateBinding("short:user-1")).toBeNull();
    expect(parseStateBinding(`x${"a".repeat(63)}:user-1`)).toBeNull();
  });

  it("rejeita binding vazio", () => {
    expect(parseStateBinding(`${"a".repeat(64)}:`)).toBeNull();
  });
});

describe("buildLinkAuthUrl", () => {
  it("monta URL para o endpoint oficial com state vinculado ao userId", () => {
    const { redirectUrl, state } = buildLinkAuthUrl(SESSION_USER_ID);
    expect(redirectUrl.startsWith("https://steamcommunity.com/openid/login?")).toBe(true);
    expect(parseStateBinding(state)).toBe(SESSION_USER_ID);

    const url = new URL(redirectUrl);
    const returnTo = url.searchParams.get("openid.return_to")!;
    expect(new URL(returnTo).searchParams.get("state")).toBe(state);
  });
});

describe("linkSteamAccount", () => {
  it("vincula com sucesso: valida OpenID, confere conflitos e persiste", async () => {
    const state = boundState();
    // Sem dono para o steamId e usuário da sessão sem Steam vinculada
    mockFindUnique(async ({ where }) => {
      if (where.steamId) return null;
      if (where.id === SESSION_USER_ID) return { steamId: null };
      return null;
    });

    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });

    expect(result).toEqual({ ok: true, steamId: STEAM_ID });

    // Persiste no usuário da SESSÃO (nunca cria/sobrescreve outro usuário)
    const [args] = mockedUpdate.mock.calls[0] as unknown as [
      { where: { id: string }; data: { steamId: string; steamLinkedAt: Date } },
    ];
    expect(args.where).toEqual({ id: SESSION_USER_ID });
    expect(args.data.steamId).toBe(STEAM_ID);
    expect(typeof args.data.steamId).toBe("string");
    expect(args.data.steamLinkedAt).toBeInstanceOf(Date);
  });

  it("enriquece com perfil público quando disponível (sem invalidar o vínculo)", async () => {
    const state = boundState();
    mockFindUnique(async ({ where }) => {
      if (where.steamId) return null;
      return { steamId: null };
    });
    mockedFetchProfile.mockResolvedValue({
      steamId: STEAM_ID,
      displayName: "GabeN",
      avatarUrl: "https://avatars.akamai.steamstatic.com/x_full.jpg",
      profileUrl: "https://steamcommunity.com/id/gaben/",
    });

    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });

    expect(result).toEqual({ ok: true, steamId: STEAM_ID });
    const [args] = mockedUpdate.mock.calls[0] as unknown as [
      { data: { steamName: string; steamAvatarUrl: string } },
    ];
    expect(args.data.steamName).toBe("GabeN");
    expect(args.data.steamAvatarUrl).toBe("https://avatars.akamai.steamstatic.com/x_full.jpg");
  });

  it("bloqueia quando o binding do state é de outro usuário (sequestro de sessão)", async () => {
    const state = boundState("user-2");
    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: false, reason: "state_invalido" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("bloqueia quando não há sessão no callback (expirou no meio do fluxo)", async () => {
    const state = boundState();
    const result = await linkSteamAccount(validLinkParams(state), state, null, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: false, reason: "sessao_expirada" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("bloqueia state malformado (forjado) mesmo com sessão válida", async () => {
    const state = "a".repeat(64);
    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: false, reason: "state_invalido" });
  });

  it("bloqueia quando a Steam rejeita o check_authentication", async () => {
    const state = boundState();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("is_valid:false"),
    });
    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher,
    });
    expect(result).toEqual({ ok: false, reason: "verificacao_falhou" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("bloqueia nonce reutilizado (anti-replay)", async () => {
    const state = boundState();
    const params = validLinkParams(state);
    markNonceUsed(params.response_nonce);

    const result = await linkSteamAccount(params, state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: false, reason: "nonce_reutilizado" });
  });

  it("bloqueia quando o steamId já pertence a OUTRA conta do sistema", async () => {
    const state = boundState();
    mockFindUnique(async ({ where }) => {
      if (where.steamId) return { id: "user-other" };
      return { steamId: null };
    });

    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: false, reason: "steam_ja_vinculado_outra_conta" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("bloqueia quando o usuário da sessão já tem OUTRA Steam vinculada", async () => {
    const state = boundState();
    mockFindUnique(async ({ where }) => {
      if (where.steamId) return null;
      return { steamId: "76561198000000001" };
    });

    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: false, reason: "ja_possui_steam" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("permite re-vincular a MESMA Steam após desvincular (idempotente)", async () => {
    const state = boundState();
    // Dono é o próprio usuário da sessão (mesmo steamId) → permitido
    mockFindUnique(async ({ where }) => {
      if (where.steamId) return { id: SESSION_USER_ID };
      return { steamId: STEAM_ID };
    });

    const result = await linkSteamAccount(validLinkParams(state), state, SESSION_USER_ID, {
      fetcher: validFetcher(),
    });
    expect(result).toEqual({ ok: true, steamId: STEAM_ID });
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
  });

  it("rejeita claimed_id malformado (nunca aceita SteamID do cliente)", async () => {
    const state = boundState();
    const result = await linkSteamAccount(
      validLinkParams(state, {
        claimed_id: "https://steamcommunity.com/openid/id/abc",
        identity: "https://steamcommunity.com/openid/id/abc",
      }),
      state,
      SESSION_USER_ID,
      { fetcher: validFetcher() }
    );
    expect(result).toEqual({ ok: false, reason: "claimed_id_invalido" });
  });
});

describe("unlinkSteamAccount", () => {
  it("remove o vínculo: limpa todos os campos steam*", async () => {
    mockUpdateResolved({ id: SESSION_USER_ID, steamId: null });

    await unlinkSteamAccount(SESSION_USER_ID);

    const [args] = mockedUpdate.mock.calls[0] as unknown as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    expect(args.where).toEqual({ id: SESSION_USER_ID });
    expect(args.data.steamId).toBeNull();
    expect(args.data.steamName).toBeNull();
    expect(args.data.steamAvatarUrl).toBeNull();
    expect(args.data.steamProfileUrl).toBeNull();
    expect(args.data.steamLinkedAt).toBeNull();
  });
});
