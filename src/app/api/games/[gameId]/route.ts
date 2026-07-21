import { prisma } from "@/lib/prisma";
import { requireAuth, requireMembership, apiSuccess, apiError, handleApiError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    const { gameId } = await params;

    // Busca o jogo para verificar o grupo
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, groupId: true, status: true, position: true },
    });

    if (!game) {
      return apiError("Jogo não encontrado", "NOT_FOUND");
    }

    // Verifica se o usuário é membro do grupo
    await requireMembership(userId, game.groupId);

    // Remove o jogo e reordena as posições restantes na coluna
    await prisma.$transaction(async (tx) => {
      await tx.game.delete({ where: { id: gameId } });

      // Reordena os jogos que estavam depois na mesma coluna
      await tx.game.updateMany({
        where: {
          groupId: game.groupId,
          status: game.status,
          position: { gt: game.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error, "api/games/[gameId] DELETE", userId);
  }
}
