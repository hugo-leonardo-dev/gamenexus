import { deleteGroup } from "@/lib/groups";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ groupId: string }>;
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
