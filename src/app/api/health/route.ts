import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  database: {
    status: "connected" | "disconnected" | "error";
    error?: {
      code: string;
      message: string;
    };
    latencyMs: number | null;
  };
  version: string;
}

export async function GET() {
  const start = Date.now();
  const response: HealthResponse = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: "connected",
      latencyMs: null,
    },
    version: "0.1.0",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    response.database.latencyMs = Date.now() - start;
    response.database.status = "connected";
  } catch (error: any) {
    response.status = "unhealthy";
    response.database.status = "disconnected";
    response.database.latencyMs = Date.now() - start;

    // Log estruturado
    logger.error("Healthcheck: banco inacessível", {
      source: "api/health",
      route: "GET /api/health",
      data: { latencyMs: response.database.latencyMs },
    }, error);

    // Mensagem segura para o cliente (sem stack)
    const errorCode = error?.code as string | undefined;
    if (errorCode) {
      response.database.error = {
        code: errorCode,
        message: getSafeErrorMessage(errorCode),
      };
    }

    return NextResponse.json(response, { status: 503 });
  }

  logger.info("Healthcheck: OK", {
    source: "api/health",
    data: { latencyMs: response.database.latencyMs },
  });

  return NextResponse.json(response, { status: 200 });
}

function getSafeErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    P1001: "Banco de dados inacessível",
    P1002: "Timeout na conexão",
    P1017: "Servidor fechou a conexão",
  };
  return messages[code] ?? "Erro de conexão com o banco de dados";
}
