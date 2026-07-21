import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 *
 * Endpoint de healthcheck utilizado pelo Docker e monitoramento.
 * Retorna o status da aplicação e da conexão com o banco de dados.
 *
 * Uso:
 *   curl http://localhost:3000/api/health
 *   curl https://gamenexus.com/api/health
 */
export async function GET() {
  const start = Date.now();

  try {
    // Verifica se o banco de dados está acessível
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "connected",
        responseTimeMs: Date.now() - start,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[healthcheck] Database connection failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "disconnected",
        responseTimeMs: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
