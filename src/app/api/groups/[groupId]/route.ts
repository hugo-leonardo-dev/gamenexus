import { prisma } from "@/lib/prisma";
import { deleteGroup } from "@/lib/groups";
import { apiSuccess, apiError, handleApiError, requireAuth } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { VALIDATIONS } from "@/lib/types";

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

/**
 * PATCH /api/groups/[groupId]
 *
 * Renomeia um grupo. Requer:
 * - Usuário autenticado
 * - Ser OWNER do grupo
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { groupId } = await params;

    if (!groupId) {
      return apiError("ID do grupo é obrigatório.", "VALIDATION_ERROR");
    }

    // Verifica se o usuário é OWNER
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return apiError("Apenas o dono do grupo pode renomeá-lo.", "FORBIDDEN");
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiError("Nome do grupo é obrigatório.", "VALIDATION_ERROR");
    }

    if (name.trim().length > VALIDATIONS.groupName.max) {
      return apiError(
        `Nome deve ter no máximo ${VALIDATIONS.groupName.max} caracteres.`,
        "VALIDATION_ERROR"
      );
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: { name: name.trim() },
    });

    logger.info("Grupo renomeado", {
      source: "api/groups/[groupId] PATCH",
      data: { groupId, oldName: null, newName: name.trim() },
    });

    return apiSuccess({ group: updated });
  } catch (error: any) {
    return handleApiError(error, "api/groups/[groupId] PATCH");
  }
}

/**
 * DELETE /api/groups/[groupId]
 *
 * Exclui um grupo. Requer:
 * - Usuário autenticado
 * - Ser OWNER do grupo
 * - Grupo não possuir participantes
 * - Confirmação exata do nome do grupo
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { groupId } = await params;

    if (!groupId) {
      return apiError("ID do grupo é obrigatório.", "VALIDATION_ERROR");
    }

    // Lê o corpo da requisição para obter o nome confirmado
    const body = await request.json();
    const { confirmedName } = body;

    if (!confirmedName || typeof confirmedName !== "string") {
      return apiError("Confirmação do nome do grupo é obrigatória.", "VALIDATION_ERROR");
    }

    await deleteGroup(groupId, confirmedName);

    logger.info("Grupo excluído com sucesso", {
      source: "api/groups/[groupId] DELETE",
      data: { groupId },
    });

    return apiSuccess({ success: true, deletedGroupId: groupId });
  } catch (error: any) {
    if (error.code === "FORBIDDEN") {
      return apiError("Apenas o dono do grupo pode excluí-lo.", "FORBIDDEN");
    }
    if (error.code === "NOT_FOUND") {
      return apiError("Grupo não encontrado.", "NOT_FOUND");
    }
    if (error.message === "GROUP_HAS_MEMBERS") {
      return apiError(
        "Este grupo ainda possui participantes. Remova todos os participantes antes de excluí-lo.",
        "CONFLICT"
      );
    }
    if (error.message === "NAME_MISMATCH") {
      return apiError(
        "O nome informado não corresponde ao nome do grupo.",
        "VALIDATION_ERROR"
      );
    }
    return handleApiError(error, "api/groups/[groupId] DELETE");
  }
}
