/**
 * Logger centralizado — GameNexus
 *
 * Fornece funções padronizadas para logging em toda a aplicação.
 * Em desenvolvimento: logs completos com stack trace.
 * Em produção: logs completos no servidor, mensagens seguras para o usuário.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  /** Rota ou endpoint (ex: "POST /api/games") */
  route?: string;
  /** ID do usuário autenticado (quando disponível) */
  userId?: string;
  /** Nome do arquivo/função onde o log foi chamado */
  source?: string;
  /** Dados adicionais relevantes (sem senhas/tokens) */
  data?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
    cause?: unknown;
  };
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry, null, process.env.NODE_ENV === "development" ? 2 : undefined);
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return true;
}

function extractErrorInfo(error: unknown): LogEntry["error"] {
  if (error instanceof Error) {
    const info: LogEntry["error"] = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };

    // Extrai código Prisma
    if ((error as any).code && typeof (error as any).code === "string") {
      info.code = (error as any).code;
    }

    // Extrai meta do Prisma
    if ((error as any).meta) {
      info.cause = (error as any).meta;
    }

    // Extrai causa (DriverAdapterError)
    if ((error as any).cause) {
      info.cause = info.cause || (error as any).cause;
    }

    return info;
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
  };

  if (context) entry.context = context;
  if (error) entry.error = extractErrorInfo(error);

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "debug":
      console.debug(formatted);
      break;
  }
}

/**
 * Logger público da aplicação.
 *
 * Uso:
 *   logger.info("Cron job iniciado", { source: "update-prices" });
 *   logger.error("Falha ao conectar no banco", { route: "GET /api/health" }, error);
 *   logger.warn("Rate limit excedido", { route: "POST /api/games", userId: "abc" });
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext, error?: unknown) =>
    log("error", message, context, error),
};

/**
 * Retorna uma mensagem segura para o usuário baseada no erro.
 * Em produção, mensagens genéricas. Em desenvolvimento, mensagens detalhadas.
 */
export function getUserMessage(error: unknown, fallback = "Erro interno do servidor."): string {
  if (process.env.NODE_ENV === "development") {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  // Em produção, mapeia erros conhecidos para mensagens amigáveis
  if (error instanceof Error) {
    const prismaCode = (error as any).code as string | undefined;

    switch (prismaCode) {
      case "P1001":
        return "Banco de dados temporariamente indisponível. Tente novamente.";
      case "P2002":
        return "Este registro já existe.";
      case "P2025":
        return "Registro não encontrado.";
      case "P2003":
        return "Operação inválida: registro relacionado não encontrado.";
    }

    switch (error.name) {
      case "AuthError":
        return error.message;
      case "SyntaxError":
        return "Formato de requisição inválido.";
    }
  }

  return fallback;
}
