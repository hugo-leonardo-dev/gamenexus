import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OPENID_NS,
  OPENID_IDENTIFIER_SELECT,
  STEAM_OPENID_ENDPOINT,
  buildSteamAuthUrl,
  buildReturnToWithState,
  createAuthSessionJwt,
  extractOpenIdParams,
  extractSteamId64,
  generateState,
  getSessionCookieName,
  getSteamAuthConfig,
  isNonceFresh,
  isNonceUsed,
  markNonceUsed,
  validateOpenIdCallback,
  verifySteamAuthentication,
  type SteamAuthConfig,
} from "@/lib/steam-auth";
import { decode } from "next-auth/jwt";

const ORIGINAL_ENV = { ...process.env };

const CONFIG: SteamAuthConfig = {
  appUrl: "http://localhost:3000",
  realm: "http://localhost:3000",
  returnTo: "http://localhost:3000/api/auth/steam/callback",
};

let nonceCounter = 0;

function freshNonce(): string {
  // Formato real da Steam: YYYY-MM-DDTHH:MM:SSZ + sufixo aleatório (sem ms)
  const iso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  nonceCounter += 1;
  const suffix = nonceCounter.toString(36).padStart(32, "0");
  return `${iso}${suffix}`;
}

function validParams(overrides: Record<string, string> = {}) {
  return {
    ns: OPENID_NS,
    mode: "id_res",
    op_endpoint: "https://steamcommunity.com/openid/login",
    claimed_id: "https://steamcommunity.com/openid/id/76561198000000000",
    identity: "https://steamcommunity.com/openid/id/76561198000000000",
    return_to: buildReturnToWithState(CONFIG, "a".repeat(64)),
    realm: CONFIG.realm,
    response_nonce: freshNonce(),
    assoc_handle: "1234567890",
    signed: "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    sig: "base64signature",
    ...overrides,
  };
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
  // Garante estado limpo do anti-replay entre testes
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildSteamAuthUrl", () => {
  it("monta a URL para o endpoint oficial da Steam", () => {
    const url = buildSteamAuthUrl(CONFIG, "state123");
    expect(url.startsWith(`${STEAM_OPENID_ENDPOINT}?`)).toBe(true);
  });

  it("inclui os parâmetros OpenID 2.0 necessários", () => {
    const url = new URL(buildSteamAuthUrl(CONFIG, "state123"));
    expect(url.searchParams.get("openid.mode")).toBe("checkid_setup");
    expect(url.searchParams.get("openid.ns")).toBe(OPENID_NS);
    expect(url.searchParams.get("openid.identity")).toBe(OPENID_IDENTIFIER_SELECT);
    expect(url.searchParams.get("openid.claimed_id")).toBe(OPENID_IDENTIFIER_SELECT);
    expect(url.searchParams.get("openid.realm")).toBe(CONFIG.realm);
  });

  it("embute o state anti-CSRF no return_to", () => {
    const url = new URL(buildSteamAuthUrl(CONFIG, "state123"));
    const returnTo = url.searchParams.get("openid.return_to");
    expect(returnTo).toBe(`${CONFIG.returnTo}?state=state123`);
  });
});

describe("generateState", () => {
  it("gera 64 caracteres hex aleatórios", () => {
    const a = generateState();
    const b = generateState();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("extractSteamId64", () => {
  it("extrai o SteamID64 de 17 dígitos como string", () => {
    expect(extractSteamId64("https://steamcommunity.com/openid/id/76561198000000000")).toBe(
      "76561198000000000"
    );
  });

  it("rejeita IDs com menos de 17 dígitos", () => {
    expect(extractSteamId64("https://steamcommunity.com/openid/id/123")).toBeNull();
  });

  it("rejeita domínio diferente do oficial", () => {
    expect(
      extractSteamId64("https://evil.example.com/openid/id/76561198000000000")
    ).toBeNull();
  });

  it("rejeita claimed_id em http (só aceita https)", () => {
    expect(
      extractSteamId64("http://steamcommunity.com/openid/id/76561198000000000")
    ).toBeNull();
  });

  it("rejeita claimed_id não numérico", () => {
    expect(
      extractSteamId64("https://steamcommunity.com/openid/id/abcabcabcabcabcab")
    ).toBeNull();
  });

  it("preserva a string completa (não perde precisão)", () => {
    const id = extractSteamId64("https://steamcommunity.com/openid/id/76561198000000000");
    expect(typeof id).toBe("string");
    expect(id).toBe("76561198000000000");
  });
});

describe("extractOpenIdParams", () => {
  it("extrai apenas parâmetros openid.* removendo o prefixo", () => {
    const sp = new URLSearchParams(
      "state=abc&openid.mode=id_res&openid.claimed_id=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Fid%2F76561198000000000&foo=bar"
    );
    expect(extractOpenIdParams(sp)).toEqual({
      mode: "id_res",
      claimed_id: "https://steamcommunity.com/openid/id/76561198000000000",
    });
  });

  it("retorna null quando não há parâmetros OpenID", () => {
    expect(extractOpenIdParams(new URLSearchParams("foo=bar"))).toBeNull();
  });
});

describe("validateOpenIdCallback", () => {
  const expectedReturnTo = buildReturnToWithState(CONFIG, "a".repeat(64));

  it("aceita um callback válido", () => {
    expect(validateOpenIdCallback(validParams(), CONFIG.realm, expectedReturnTo)).toEqual({
      ok: true,
    });
  });

  it("rejeita mode diferente de id_res", () => {
    const result = validateOpenIdCallback(
      validParams({ mode: "cancel" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "mode_invalido" });
  });

  it("rejeita op_endpoint de outro provedor", () => {
    const result = validateOpenIdCallback(
      validParams({ op_endpoint: "https://evil.example.com/openid/login" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "op_endpoint_invalido" });
  });

  it("aceita op_endpoint http (comportamento real da Steam)", () => {
    const result = validateOpenIdCallback(
      validParams({ op_endpoint: "http://steamcommunity.com/openid/login" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: true });
  });

  it("aceita callback SEM realm (a Steam não ecoa realm no id_res)", () => {
    const { realm: _removed, ...params } = validParams();
    void _removed;
    const result = validateOpenIdCallback(params, CONFIG.realm, expectedReturnTo);
    expect(result).toEqual({ ok: true });
  });

  it("rejeita claimed_id malformado", () => {
    const result = validateOpenIdCallback(
      validParams({ claimed_id: "https://steamcommunity.com/openid/id/abc" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "claimed_id_invalido" });
  });

  it("rejeita identity divergente do claimed_id", () => {
    const result = validateOpenIdCallback(
      validParams({ identity: "https://steamcommunity.com/openid/id/76561198000000001" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "identity_invalido" });
  });

  it("rejeita return_to incompatível", () => {
    const result = validateOpenIdCallback(
      validParams({ return_to: "https://evil.example.com/callback" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "return_to_incompativel" });
  });

  it("rejeita realm incompatível", () => {
    const result = validateOpenIdCallback(
      validParams({ realm: "https://evil.example.com" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "realm_incompativel" });
  });

  it("rejeita nonce ausente", () => {
    const { response_nonce: _removed, ...params } = validParams();
    void _removed;
    const result = validateOpenIdCallback(params, CONFIG.realm, expectedReturnTo);
    expect(result).toEqual({ ok: false, reason: "nonce_expirado" });
  });

  it("rejeita nonce malformado", () => {
    const result = validateOpenIdCallback(
      validParams({ response_nonce: "not-a-nonce" }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "nonce_expirado" });
  });

  it("rejeita nonce antigo (fora da janela de frescor)", () => {
    const oldNonce = `2020-01-01T00:00:00Zabcdef0123456789abcdef0123456789`;
    const result = validateOpenIdCallback(
      validParams({ response_nonce: oldNonce }),
      CONFIG.realm,
      expectedReturnTo
    );
    expect(result).toEqual({ ok: false, reason: "nonce_expirado" });
  });
});

describe("isNonceFresh", () => {
  it("aceita nonce dentro da janela", () => {
    expect(isNonceFresh(freshNonce())).toBe(true);
  });

  it("rejeita nonce antigo", () => {
    expect(isNonceFresh("2020-01-01T00:00:00Z1234567890")).toBe(false);
  });

  it("rejeita formato inválido", () => {
    expect(isNonceFresh("garbage")).toBe(false);
  });
});

describe("isNonceUsed / markNonceUsed (anti-replay)", () => {
  it("aceita o primeiro uso e rejeita a repetição após marcar", () => {
    const nonce = freshNonce();
    expect(isNonceUsed(nonce)).toBe(false);
    markNonceUsed(nonce);
    expect(isNonceUsed(nonce)).toBe(true);
  });

  it("apenas verificar não marca o nonce como usado (sem queimar em falhas)", () => {
    const nonce = freshNonce();
    isNonceUsed(nonce);
    isNonceUsed(nonce);
    expect(isNonceUsed(nonce)).toBe(false);
  });
});

describe("verifySteamAuthentication (check_authentication)", () => {
  it("considera válido com is_valid:true (a Steam não ecoa parâmetros)", async () => {
    const params = validParams();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("is_valid:true"),
    });

    expect(await verifySteamAuthentication(params, fetcher as unknown as typeof fetch)).toBe(true);

    // O POST deve incluir todos os parâmetros + mode=check_authentication
    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    const sent = new URLSearchParams(String(init.body));
    expect(sent.get("openid.mode")).toBe("check_authentication");
    expect(sent.get("openid.claimed_id")).toBe(params.claimed_id);
  });

  it("rejeita is_valid:false", async () => {
    const params = validParams();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("is_valid:false"),
    });
    expect(await verifySteamAuthentication(params, fetcher as unknown as typeof fetch)).toBe(false);
  });

  it("rejeita resposta sem o campo is_valid", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("openid.mode:id_res"),
    });
    expect(await verifySteamAuthentication(validParams(), fetcher as unknown as typeof fetch)).toBe(
      false
    );
  });

  it("rejeita resposta HTTP não-ok", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    expect(await verifySteamAuthentication(validParams(), fetcher as unknown as typeof fetch)).toBe(
      false
    );
  });

  it("rejeita falha de rede (sem lançar)", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    expect(await verifySteamAuthentication(validParams(), fetcher as unknown as typeof fetch)).toBe(
      false
    );
  });
});

describe("configuração de sessão", () => {
  it("usa cookie simples em dev (http)", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(getSessionCookieName()).toBe("authjs.session-token");
  });

  it("usa cookie __Secure- em produção (https)", () => {
    process.env.NEXTAUTH_URL = "https://gamenexus.vercel.app";
    expect(getSessionCookieName()).toBe("__Secure-authjs.session-token");
  });

  it("getSteamAuthConfig deriva realm e returnTo da URL pública", () => {
    const cfg = getSteamAuthConfig();
    expect(cfg.realm).toBe("http://localhost:3000");
    expect(cfg.returnTo).toBe("http://localhost:3000/api/auth/steam/callback");
  });

  it("lança erro sem NEXTAUTH_URL", () => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.AUTH_URL;
    expect(() => getSteamAuthConfig()).toThrow();
  });
});

describe("createAuthSessionJwt", () => {
  // Mesmo salt usado pelo auth() ao decodificar (nome do cookie de sessão)
  function decodeWithSameSalt(token: string) {
    return decode({ token, secret: "test-secret-0123456789abcdef", salt: getSessionCookieName() });
  }

  it("gera um JWT Auth.js válido com id/name/picture", async () => {
    const token = await createAuthSessionJwt({
      id: "user-1",
      name: "GabeN",
      avatarUrl: "https://avatars.akamai.steamstatic.com/x_full.jpg",
    });

    const decoded = await decodeWithSameSalt(token);
    expect(decoded?.id).toBe("user-1");
    expect(decoded?.sub).toBe("user-1");
    expect(decoded?.name).toBe("GabeN");
    expect(decoded?.picture).toBe("https://avatars.akamai.steamstatic.com/x_full.jpg");
  });

  it("regenera a sessão (novo jti a cada login — anti fixation)", async () => {
    const user = { id: "user-1", name: "GabeN", avatarUrl: null };
    const token1 = await createAuthSessionJwt(user);
    const token2 = await createAuthSessionJwt(user);
    const decoded1 = await decodeWithSameSalt(token1);
    const decoded2 = await decodeWithSameSalt(token2);
    expect(decoded1?.jti).toBeTruthy();
    expect(decoded1?.jti).not.toBe(decoded2?.jti);
  });

  it("lança erro sem AUTH_SECRET", async () => {
    delete process.env.AUTH_SECRET;
    await expect(
      createAuthSessionJwt({ id: "user-1", name: "x", avatarUrl: null })
    ).rejects.toThrow();
  });
});
