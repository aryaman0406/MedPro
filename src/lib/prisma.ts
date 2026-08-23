import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getFormattedDatabaseUrl = (): string | undefined => {
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!rawUrl || rawUrl.trim().length === 0) {
    return undefined;
  }

  let formatted = rawUrl.trim();

  // Enforce a strict pool size of 2 connections and 5s pool timeout to prevent PgBouncer EMAXCONNSESSION errors and 1-minute hangs.
  if (!formatted.includes("connection_limit=")) {
    const separator = formatted.includes("?") ? "&" : "?";
    formatted = `${formatted}${separator}connection_limit=2&pool_timeout=5`;
  }

  return formatted;
};

const dbUrl = getFormattedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always store global singleton across execution contexts
globalForPrisma.prisma = prisma;

/**
 * Resilient Database Execution Helper with Automatic Backoff Retry
 * Catches transient PgBouncer pool exhaustion (EMAXCONNSESSION) or timeout errors
 * and automatically retries up to `maxRetries` times before propagating.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelayMs = 150
): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || String(error);
      const isPoolOrConnError =
        errorMessage.includes("EMAXCONNSESSION") ||
        errorMessage.includes("max clients reached") ||
        errorMessage.includes("pool_timeout") ||
        errorMessage.includes("Connection pool") ||
        errorMessage.includes("P1001") ||
        errorMessage.includes("P1002") ||
        errorMessage.includes("P1017");

      if (isPoolOrConnError && attempt <= maxRetries) {
        console.warn(
          `[Prisma Pool Backoff] Attempt ${attempt}/${maxRetries} failed: ${errorMessage}. Retrying in ${initialDelayMs * attempt}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, initialDelayMs * attempt));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Failed to execute database query after maximum retries.");
}
