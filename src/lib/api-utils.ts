import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Respostas de erro padronizadas ────────────────────────────────────
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

interface ApiError {
  error: string;
  code?: ApiErrorCode;
  details?: unknown;
}

function statusFromCode(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED": return 401;
    case "FORBIDDEN": return 403;
    case "NOT_FOUND": return 404;
    case "VALIDATION_ERROR": return 400;
    case "CONFLICT": return 409;
    case "RATE_LIMITED": return 429;
    case "UPSTREAM_ERROR": return 502;
    case "INTERNAL_ERROR": return 500;
  }
}

export function apiError(
  message: string,
  codeOrStatus: ApiErrorCode | number = "INTERNAL_ERROR",
  details?: unknown
): NextResponse {
  const status = typeof codeOrStatus === "number" ? codeOrStatus : statusFromCode(codeOrStatus);
  const body: ApiError = { error: message };
  if (typeof codeOrStatus === "string") body.code = codeOrStatus;
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ─── Helpers de autenticação ──────────────────────────────────────────

/** Verifica se o usuário está autenticado e retorna o userId. */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }
  return session.user.id;
}

/** Verifica se o usuário é membro de um grupo. Retorna a membership. */
export async function requireMembership(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) {
    throw new AuthError("FORBIDDEN", "Você não é membro deste grupo.");
  }
  return membership;
}

/** Verifica se o usuário é OWNER de um grupo. */
export async function requireOwner(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) {
    throw new AuthError("FORBIDDEN", "Você não é membro deste grupo.");
  }
  if (membership.role !== "OWNER") {
    throw new AuthError("FORBIDDEN", "Apenas o dono do grupo pode realizar esta ação.");
  }
  return membership;
}

// ─── Erro customizado para auth ──────────────────────────────────────
export class AuthError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "AuthError";
  }
}

// ─── Mapa de mensagens amigáveis para erros internos ──────────────
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Não autorizado. Faça login primeiro.",
  FORBIDDEN: "Acesso negado.",
  NOT_FOUND: "Recurso não encontrado.",
  "INVITE_NOT_FOUND": "Código de convite inválido ou grupo não encontrado.",
  ALREADY_MEMBER: "Você já é membro deste grupo.",
  LAST_OWNER: "Não é possível remover o único dono do grupo.",
  "Failed to generate unique invite code": "Erro ao gerar código de convite.",
};

function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }
  if (error instanceof Error) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }
  return "Erro interno do servidor.";
}

// ─── Handler genérico para capturar erros em API routes ──────────────
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof AuthError) {
    return apiError(getUserFriendlyMessage(error), error.code);
  }

  if (error instanceof SyntaxError) {
    return apiError("Formato de requisição inválido.", "VALIDATION_ERROR");
  }

  console.error(`[api] Erro em ${context}:`, error);
  return apiError(
    process.env.NODE_ENV === "production"
      ? "Erro interno do servidor."
      : getUserFriendlyMessage(error),
    "INTERNAL_ERROR"
  );
}
