import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── Tipos de erro ────────────────────────────────────────────────────
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

interface ApiErrorBody {
  error: string;
  code?: ApiErrorCode;
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
    case "DATABASE_ERROR": return 503;
    case "INTERNAL_ERROR": return 500;
  }
}

/**
 * Retorna uma resposta de erro padronizada para o cliente.
 * O usuário NUNCA vê stack trace ou detalhes internos.
 */
export function apiError(
  message: string,
  codeOrStatus: ApiErrorCode | number = "INTERNAL_ERROR"
): NextResponse {
  const status = typeof codeOrStatus === "number" ? codeOrStatus : statusFromCode(codeOrStatus);
  const body: ApiErrorBody = { error: message };
  if (typeof codeOrStatus === "string") body.code = codeOrStatus;
  return NextResponse.json(body, { status });
}

/**
 * Retorna uma resposta de sucesso padronizada.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ─── Autenticação ─────────────────────────────────────────────────────

/** Verifica se o usuário está autenticado e retorna o userId. */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }
  return session.user.id;
}

/** Verifica se o usuário é membro de um grupo. */
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

// ─── Erro customizado ────────────────────────────────────────────────
export class AuthError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "AuthError";
  }
}

// ─── Mapa de mensagens amigáveis ────────────────────────────────────
const USER_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Não autorizado. Faça login primeiro.",
  FORBIDDEN: "Acesso negado.",
  NOT_FOUND: "Recurso não encontrado.",
  "INVITE_NOT_FOUND": "Código de convite inválido ou grupo não encontrado.",
  ALREADY_MEMBER: "Você já é membro deste grupo.",
  LAST_OWNER: "Não é possível remover o único dono do grupo.",
};

// ─── Prisma: mapeamento de códigos de erro ──────────────────────────
const PRISMA_ERROR_CODES: Record<string, { code: ApiErrorCode; message: string }> = {
  P1001: { code: "DATABASE_ERROR", message: "Banco de dados temporariamente indisponível." },
  P1002: { code: "DATABASE_ERROR", message: "Timeout na conexão com o banco de dados." },
  P2002: { code: "CONFLICT", message: "Este registro já existe." },
  P2025: { code: "NOT_FOUND", message: "Registro não encontrado." },
  P2003: { code: "CONFLICT", message: "Operação inválida: registro relacionado não encontrado." },
  P2010: { code: "INTERNAL_ERROR", message: "Erro na execução da consulta." },
};

function getPrismaErrorInfo(error: any): { code: ApiErrorCode; message: string } | null {
  const prismaCode = error?.code as string | undefined;
  if (prismaCode && PRISMA_ERROR_CODES[prismaCode]) {
    return PRISMA_ERROR_CODES[prismaCode];
  }
  return null;
}

function getClientMessage(error: unknown): string {
  // AuthError
  if (error instanceof AuthError) {
    return USER_MESSAGES[error.message] ?? error.message;
  }

  // Prisma errors
  if (error instanceof Error) {
    const prismaInfo = getPrismaErrorInfo(error);
    if (prismaInfo) return prismaInfo.message;

    // Error comum
    if (error instanceof SyntaxError) {
      return "Formato de requisição inválido.";
    }

    return USER_MESSAGES[error.message] ?? error.message;
  }

  return "Erro interno do servidor.";
}

// ─── Handler principal de erros ─────────────────────────────────────
export function handleApiError(error: unknown, context: string, userId?: string): NextResponse {
  const timestamp = new Date().toISOString();
  const isDev = process.env.NODE_ENV === "development";

  // ── Log detalhado no servidor ─────────────────────────────────
  logger.error("API Error", {
    source: "handleApiError",
    route: context,
    userId,
    data: {
      timestamp,
      isDev,
    },
  }, error);

  // ── AuthError ─────────────────────────────────────────────────
  if (error instanceof AuthError) {
    return apiError(getClientMessage(error), error.code);
  }

  // ── SyntaxError (JSON mal formatado) ──────────────────────────
  if (error instanceof SyntaxError) {
    return apiError("Formato de requisição inválido.", "VALIDATION_ERROR");
  }

  // ── Prisma errors específicos ─────────────────────────────────
  if (error instanceof Error && (error as any).code) {
    const prismaInfo = getPrismaErrorInfo(error);
    if (prismaInfo) {
      return apiError(prismaInfo.message, prismaInfo.code);
    }
  }

  // ── Erro genérico ─────────────────────────────────────────────
  return apiError(
    isDev ? getClientMessage(error) : "Erro interno do servidor.",
    "INTERNAL_ERROR"
  );
}
