import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { VALID_STATUSES } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { gameId } = await params;

    const body = await request.json();
    const { status, position, groupId } = body;

    if (!status || typeof position !== "number" || !groupId) {
      return apiError("Dados inválidos. status, position e groupId são obrigatórios.", "VALIDATION_ERROR");
    }

    if (!VALID_STATUSES.includes(status)) {
      return apiError("Status inválido. Use: BACKLOG, PLAYING, COMPLETED ou DROPPED.", "VALIDATION_ERROR");
    }

    if (typeof position !== "number" || position < 0) {
      return apiError("Position deve ser um número não negativo.", "VALIDATION_ERROR");
    }

    // Verifica se o usuário é membro do grupo
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!membership) {
      return apiError("Acesso negado. Você não é membro deste grupo.", "FORBIDDEN");
    }

    // Busca o jogo
    const game = await prisma.game.findFirst({
      where: { id: gameId, groupId },
    });

    if (!game) {
      return apiError("Jogo não encontrado.", "NOT_FOUND");
    }

    // Usa transação para evitar race conditions
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (game.status !== status) {
        // Mudou de coluna: remove da posição antiga
        await tx.game.updateMany({
          where: {
            groupId,
            status: game.status,
            position: { gt: game.position },
          },
          data: { position: { decrement: 1 } },
        });

        // Abre espaço na nova coluna
        await tx.game.updateMany({
          where: {
            groupId,
            status,
            position: { gte: position },
          },
          data: { position: { increment: 1 } },
        });
      } else {
        // Mesma coluna: reordenação
        if (position > game.position) {
          await tx.game.updateMany({
            where: {
              groupId,
              status,
              position: { gt: game.position, lte: position },
            },
            data: { position: { decrement: 1 } },
          });
        } else if (position < game.position) {
          await tx.game.updateMany({
            where: {
              groupId,
              status,
              position: { gte: position, lt: game.position },
            },
            data: { position: { increment: 1 } },
          });
        }
      }

      // Atualiza o jogo
      await tx.game.update({
        where: { id: gameId },
        data: { status, position },
      });
    });

    return apiSuccess({ ok: true });
  } catch (error: any) {
    return handleApiError(error, "api/games/[gameId]/move PATCH");
  }
}
