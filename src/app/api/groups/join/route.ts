import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { joinGroup } from "@/lib/groups";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== "string" || inviteCode.trim().length === 0) {
      return apiError("Código de convite é obrigatório", "VALIDATION_ERROR");
    }

    if (inviteCode.trim().length > 10) {
      return apiError("Código de convite inválido", "VALIDATION_ERROR");
    }

    const group = await joinGroup(inviteCode);

    return apiSuccess({ group });
  } catch (error: any) {
    if (error.message === "INVITE_NOT_FOUND") {
      return apiError("Código de convite inválido ou grupo não encontrado.", "NOT_FOUND");
    }
    if (error.message === "ALREADY_MEMBER") {
      return apiError("Você já é membro deste grupo.", "CONFLICT");
    }
    return handleApiError(error, "api/groups/join POST");
  }
}
