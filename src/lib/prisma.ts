import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[prisma] DATABASE_URL não definida!");
    throw new Error(
      "DATABASE_URL não definida. Configure a variável de ambiente DATABASE_URL " +
      "com a URL de conexão do PostgreSQL.\n" +
      "Exemplo: DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true"
    );
  }

  console.log("[prisma] Inicializando Pool...");
  console.log("[prisma] Host:", connectionString.split("@")[1]?.split("/")[0] || "desconhecido");
  console.log("[prisma] SSL ativado (rejectUnauthorized: false)");

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("supabase")
      ? { rejectUnauthorized: false }
      : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("[prisma] Erro no Pool:", err.message);
  });

  const adapter = new PrismaPg(pool);

  console.log("[prisma] PrismaClient inicializado com sucesso");

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
