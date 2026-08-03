import { prisma } from "./prisma";
import type { SteamProfile } from "./steam-profile";

export interface SteamUserData {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Cria ou atualiza o usuário a partir do SteamID64 (já verificado pela Steam).
 *
 * Idempotente: o upsert por `steamId` (único) nunca duplica usuários, mesmo em
 * callbacks concorrentes.
 *
 * Em logins seguintes NÃO sobrescreve `name`/`avatarUrl` — campos que o usuário
 * pode customizar no perfil. Atualiza apenas os campos `steam*` (dados oficiais
 * do perfil Steam) e `lastLoginAt`.
 *
 * Não há vinculação automática com contas Discord/email: identidades não
 * verificadas nunca são linkadas.
 */
export async function upsertSteamUser(
  steamId: string,
  profile: SteamProfile | null
): Promise<SteamUserData> {
  return prisma.user.upsert({
    where: { steamId },
    create: {
      steamId,
      name: profile?.displayName ?? "Steam User",
      avatarUrl: profile?.avatarUrl ?? null,
      steamName: profile?.displayName ?? null,
      steamAvatarUrl: profile?.avatarUrl ?? null,
      steamProfileUrl: profile?.profileUrl ?? null,
      lastLoginAt: new Date(),
    },
    update: {
      // undefined = campo não alterado (ex: perfil indisponível nesta tentativa)
      ...(profile?.displayName ? { steamName: profile.displayName } : {}),
      ...(profile?.avatarUrl ? { steamAvatarUrl: profile.avatarUrl } : {}),
      ...(profile?.profileUrl ? { steamProfileUrl: profile.profileUrl } : {}),
      lastLoginAt: new Date(),
    },
    select: { id: true, name: true, avatarUrl: true },
  });
}
