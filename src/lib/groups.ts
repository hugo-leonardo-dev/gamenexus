import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuthError } from "@/lib/api-utils";
import crypto from "crypto";

/**
 * Gera um código de convite único no formato "JOG-XXXXXX".
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sem 0, O, I, 1 para evitar confusão
  let code = "JOG-";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

/**
 * Cria um novo grupo e adiciona o usuário como OWNER.
 */
export async function createGroup(name: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }

  // Gera um inviteCode único
  let inviteCode: string;
  let attempts = 0;
  do {
    inviteCode = generateInviteCode();
    const existing = await prisma.group.findUnique({ where: { inviteCode } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new Error("Failed to generate unique invite code");
  }

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { members: true, games: true },
      },
    },
  });

  return group;
}

/**
 * Lista os grupos que o usuário participa.
 */
export async function listUserGroups() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          _count: {
            select: { members: true, games: true },
          },
        },
      },
    },
    orderBy: { group: { createdAt: "desc" } },
  });

  return memberships.map((m) => ({
    ...m.group,
    role: m.role,
    joinedAt: m.createdAt,
  }));
}

/**
 * Remove um membro de um grupo (apenas OWNER).
 */
export async function removeMember(groupId: string, memberId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }

  // Verifica se o usuário é OWNER do grupo
  const requester = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
  });

  if (!requester || requester.role !== "OWNER") {
    throw new AuthError("FORBIDDEN");
  }

  // Busca o membro a ser removido
  const target = await prisma.groupMember.findUnique({
    where: { id: memberId },
  });

  if (!target) {
    throw new AuthError("NOT_FOUND");
  }

  if (target.groupId !== groupId) {
    throw new AuthError("FORBIDDEN");
  }

  // Não permite remover o último OWNER
  if (target.role === "OWNER") {
    const ownerCount = await prisma.groupMember.count({
      where: { groupId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      throw new AuthError("CONFLICT", "LAST_OWNER");
    }
  }

  // Remove o membro
  await prisma.groupMember.delete({
    where: { id: memberId },
  });

  return { removed: target.userId };
}

/**
 * Exclui um grupo (apenas OWNER, grupo sem participantes e confirmação de nome).
 */
export async function deleteGroup(groupId: string, confirmedName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }

  // Verifica se o usuário é OWNER do grupo
  const requester = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
  });

  if (!requester || requester.role !== "OWNER") {
    throw new AuthError("FORBIDDEN");
  }

  // Busca o grupo
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new AuthError("NOT_FOUND");
  }

  // Verifica se existem participantes (excluindo o próprio usuário)
  const otherMembersCount = await prisma.groupMember.count({
    where: {
      groupId,
      userId: { not: session.user.id },
    },
  });

  if (otherMembersCount > 0) {
    throw new AuthError("CONFLICT", "GROUP_HAS_MEMBERS");
  }

  // Valida a confirmação do nome
  if (confirmedName !== group.name) {
    throw new AuthError("VALIDATION_ERROR", "NAME_MISMATCH");
  }

  // Exclui o grupo (em cascata deleta jogos, membros, etc.)
  await prisma.group.delete({
    where: { id: groupId },
  });

  return { deleted: groupId };
}

/**
 * Entra em um grupo usando o código de convite.
 */
export async function joinGroup(inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }

  const code = inviteCode.trim().toUpperCase();

  // Busca o grupo pelo código
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
  });

  if (!group) {
    throw new AuthError("NOT_FOUND", "INVITE_NOT_FOUND");
  }

  // Verifica se já é membro
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId: group.id,
      },
    },
  });

  if (existingMember) {
    throw new AuthError("CONFLICT", "ALREADY_MEMBER");
  }

  // Adiciona como MEMBER
  const membership = await prisma.groupMember.create({
    data: {
      userId: session.user.id,
      groupId: group.id,
      role: "MEMBER",
    },
    include: {
      group: {
        include: {
          _count: {
            select: { members: true, games: true },
          },
        },
      },
    },
  });

  return membership.group;
}
