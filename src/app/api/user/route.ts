import { prisma } from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { VALIDATIONS } from "@/lib/types";

/**
 * PATCH /api/user
 *
 * Atualiza informações do perfil do usuário autenticado.
 * Campos suportados: name, avatarUrl
 */
export async function PATCH(request: Request) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { name, avatarUrl } = body;

    // Valida nome se fornecido
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < VALIDATIONS.userName.min) {
        return apiError(
          `Nome deve ter pelo menos ${VALIDATIONS.userName.min} caracteres.`,
          "VALIDATION_ERROR"
        );
      }
      if (name.trim().length > VALIDATIONS.userName.max) {
        return apiError(
          `Nome deve ter no máximo ${VALIDATIONS.userName.max} caracteres.`,
          "VALIDATION_ERROR"
        );
      }
    }

    // Valida avatarUrl se fornecido
    if (avatarUrl !== undefined && typeof avatarUrl !== "string") {
      return apiError("Avatar inválido.", "VALIDATION_ERROR");
    }

    // Monta dados para atualização
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name.trim();
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return apiSuccess({ user });
  } catch (error: any) {
    return handleApiError(error, "api/user PATCH");
  }
}
