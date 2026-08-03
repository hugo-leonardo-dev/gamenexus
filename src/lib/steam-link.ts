import { prisma } from "./prisma";
import {
  buildReturnToWithState,
  buildSteamAuthUrl,
  extractSteamId64,
  generateStateWithBinding,
  getSteamAuthConfig,
  isNonceUsed,
  markNonceUsed,
  parseStateBinding,
  validateOpenIdCallback,
  verifySteamAuthentication,
} from "./steam-auth";
import { fetchSteamProfile } from "./steam-profile";

/**
 * Steam Account Linking — vincula uma conta Steam existente (OpenID 2.0) ao
 * usuário JÁ autenticado no GameNexus (Discord/Email).
 *
 * Este fluxo NÃO é login: o usuário precisa estar logado. Reutiliza todo o
 * protocolo OpenID de `steam-auth.ts` (validação local + check_authentication
 * + state anti-CSRF + nonce anti-replay) para que o login direto por Steam e
 * a vinculação compartilhem exatamente a mesma validação de segurança.
 *
 * Segurança do fluxo:
 *  - O state é um cookie HttpOnly cujo valor embute o userId (binding) — o
 *    navegador não lê/forja, e a Steam ecoa o valor completo no return_to.
 *  - No callback validamos que o usuário da sessão atual é o MESMO que iniciou
 *    o fluxo (bloqueia "usuário A inicia, usuário B confirma").
 *  - Conflitos: steamId já vinculado a outro usuário → bloqueia; usuário já
 *    com Steam vinculada → bloqueia até desvincular (evita perda acidental).
 *  - O `steamId` tem constraint de unicidade no banco — garantia final além
 *    da lógica de aplicação (P2002 é tratado como conflito na rota).
 */

export const LINK_CALLBACK_PATH = "/api/steam/link/callback";
export const LINK_STATE_COOKIE_NAME = "steam_link_state";
/** Cookie enviado apenas ao callback de vinculação. */
export const LINK_STATE_COOKIE_PATH = LINK_CALLBACK_PATH;
/** Janela do fluxo: 10 min (tempo para o usuário autorizar na Steam). */
export const LINK_STATE_MAX_AGE_SECONDS = 600;

export type LinkErrorReason =
  | "state_invalido"
  | "sessao_expirada"
  | "ns_invalido"
  | "mode_invalido"
  | "op_endpoint_invalido"
  | "claimed_id_invalido"
  | "identity_invalido"
  | "return_to_incompativel"
  | "realm_incompativel"
  | "nonce_expirado"
  | "nonce_reutilizado"
  | "verificacao_falhou"
  | "steam_ja_vinculado_outra_conta"
  | "ja_possui_steam"
  | "usuario_inexistente";

export type LinkResult =
  | { ok: true; steamId: string }
  | { ok: false; reason: LinkErrorReason };

/**
 * Monta a URL de redirecionamento para a Steam com o state vinculado ao
 * usuário que está iniciando a vinculação.
 */
export function buildLinkAuthUrl(userId: string): { redirectUrl: string; state: string } {
  const config = getSteamAuthConfig(LINK_CALLBACK_PATH);
  const state = generateStateWithBinding(userId);
  return { redirectUrl: buildSteamAuthUrl(config, state), state };
}

/**
 * Executa a validação completa do callback de vinculação e persiste o vínculo.
 *
 * Ordem (todas as camadas de segurança antes de tocar no banco):
 *  1. state com binding válido + binding === usuário da sessão atual;
 *  2. validação local dos parâmetros OpenID (return_to exato, op_endpoint,
 *     claimed_id, identity, realm se enviado, frescor do nonce);
 *  3. anti-replay do nonce;
 *  4. check_authentication com a Steam (is_valid:true);
 *  5. extração do SteamID64 (apenas do claimed_id);
 *  6. conflitos de vinculação;
 *  7. persistência (update idempotente no usuário da sessão).
 *
 * `fetcher` é injetável para testes (nunca chamar a Steam real em testes).
 */
export async function linkSteamAccount(
  params: Record<string, string>,
  state: string,
  sessionUserId: string | null,
  deps: { fetcher?: typeof fetch } = {}
): Promise<LinkResult> {
  const config = getSteamAuthConfig(LINK_CALLBACK_PATH);

  // ── 1. Binding: quem confirmou o callback deve ser quem iniciou o fluxo ──
  const bindingUserId = parseStateBinding(state);
  if (!bindingUserId) return { ok: false, reason: "state_invalido" };
  if (!sessionUserId) return { ok: false, reason: "sessao_expirada" };
  if (bindingUserId !== sessionUserId) return { ok: false, reason: "state_invalido" };

  // ── 2. Validação local dos parâmetros OpenID ──
  const validation = validateOpenIdCallback(
    params,
    config.realm,
    buildReturnToWithState(config, state)
  );
  if (!validation.ok) return { ok: false, reason: validation.reason as LinkErrorReason };

  // ── 3. Anti-replay ──
  if (isNonceUsed(params.response_nonce)) return { ok: false, reason: "nonce_reutilizado" };

  // ── 4. Confirmação real com a Steam ──
  if (!(await verifySteamAuthentication(params, deps.fetcher))) {
    return { ok: false, reason: "verificacao_falhou" };
  }
  // Marca apenas após a verificação aceita (não queima nonce em tentativas falhas)
  markNonceUsed(params.response_nonce);

  // ── 5. SteamID64 apenas do claimed_id verificado ──
  const steamId = extractSteamId64(params.claimed_id);
  if (!steamId) return { ok: false, reason: "claimed_id_invalido" };

  // ── 6. Conflitos ──
  // 6a. O SteamID já pertence a outro usuário do sistema → bloqueia (não
  //     sobrescreve silenciosamente; a constraint única do banco reforça).
  const owner = await prisma.user.findUnique({
    where: { steamId },
    select: { id: true },
  });
  if (owner && owner.id !== sessionUserId) {
    return { ok: false, reason: "steam_ja_vinculado_outra_conta" };
  }

  // 6b. O usuário já tem outra Steam vinculada → bloqueia até desvincular.
  const me = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { steamId: true },
  });
  if (!me) return { ok: false, reason: "usuario_inexistente" };
  if (me.steamId && me.steamId !== steamId) {
    return { ok: false, reason: "ja_possui_steam" };
  }

  // ── 7. Perfil público (opcional) + persistência idempotente ──
  // Falha do perfil NUNCA invalida a vinculação já verificada.
  const profile = await fetchSteamProfile(steamId);

  await prisma.user.update({
    where: { id: sessionUserId },
    data: {
      steamId,
      steamName: profile?.displayName ?? null,
      steamAvatarUrl: profile?.avatarUrl ?? null,
      steamProfileUrl: profile?.profileUrl ?? null,
      steamLinkedAt: new Date(),
    },
  });

  return { ok: true, steamId };
}

/**
 * Remove o vínculo com a Steam do usuário (desvinculação).
 * Nesta task, só existem dados diretamente dependentes do vínculo (os campos
 * steam*) — biblioteca/posse são de tasks futuras.
 */
export async function unlinkSteamAccount(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      steamId: null,
      steamName: null,
      steamAvatarUrl: null,
      steamProfileUrl: null,
      steamLinkedAt: null,
    },
    select: { id: true, steamId: true },
  });
}
