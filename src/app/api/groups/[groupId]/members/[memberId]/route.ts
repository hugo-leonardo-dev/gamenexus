import { removeMember } from "@/lib/groups";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ groupId: string; memberId: string }>;
}

/**
 * DELETE /api/groups/[groupId]/members/[memberId]
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { groupId, memberId } = await params;

    if (!groupId || !memberId) {
      return apiError("Parâmetros inválidos", "VALIDATION_ERROR");
    }

    await removeMember(groupId, memberId);

    return apiSuccess({ success: true });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") {
      return apiError("Apenas o dono do grupo pode remover membros.", "FORBIDDEN");
    }
    if (error.message === "NOT_FOUND") {
      return apiError("Membro não encontrado.", "NOT_FOUND");
    }
    if (error.message === "LAST_OWNER") {
      return apiError("Não é possível remover o único dono do grupo.", "CONFLICT");
    }
    return handleApiError(error, "api/groups/members DELETE");
  }
}
