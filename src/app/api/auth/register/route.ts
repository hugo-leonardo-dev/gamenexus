import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { VALIDATIONS } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validações
    if (!name || typeof name !== "string" || name.trim().length < VALIDATIONS.userName.min) {
      return apiError(`Nome deve ter pelo menos ${VALIDATIONS.userName.min} caracteres.`, "VALIDATION_ERROR");
    }

    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return apiError("Email inválido.", "VALIDATION_ERROR");
    }

    if (!password || typeof password !== "string" || password.length < VALIDATIONS.password.min) {
      return apiError(`Senha deve ter pelo menos ${VALIDATIONS.password.min} caracteres.`, "VALIDATION_ERROR");
    }

    if (password.length > VALIDATIONS.password.max) {
      return apiError(`Senha deve ter no máximo ${VALIDATIONS.password.max} caracteres.`, "VALIDATION_ERROR");
    }

    // Verifica se o email já está em uso
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return apiError("Este email já está cadastrado.", "CONFLICT");
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12);

    // Cria o usuário
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        emailVerified: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return apiSuccess({ message: "Conta criada com sucesso!", user }, 201);
  } catch (error: any) {
    return handleApiError(error, "api/auth/register POST");
  }
}
