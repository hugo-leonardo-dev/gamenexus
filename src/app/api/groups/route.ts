import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { createGroup, listUserGroups } from "@/lib/groups";
import { VALIDATIONS } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiError("Nome do grupo é obrigatório", "VALIDATION_ERROR");
    }

    if (name.trim().length > VALIDATIONS.groupName.max) {
      return apiError(
        `Nome do grupo deve ter no máximo ${VALIDATIONS.groupName.max} caracteres`,
        "VALIDATION_ERROR"
      );
    }

    const group = await createGroup(name.trim());

    return apiSuccess({ group }, 201);
  } catch (error: any) {
    return handleApiError(error, "api/groups POST");
  }
}

export async function GET() {
  try {
    const groups = await listUserGroups();
    return apiSuccess({ groups });
  } catch (error: any) {
    return handleApiError(error, "api/groups GET");
  }
}
