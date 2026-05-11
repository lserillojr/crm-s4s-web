import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Health check endpoint.
 *
 * Retorna 200 se DB OK, 503 se algum check degradado.
 * Consumido por Portainer healthcheck + smokes E2E + monitoring futuro.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "error";

export async function GET() {
  const checks: Record<string, CheckStatus> = {};
  const errors: string[] = [];

  // DB check
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch (e) {
    checks.db = "error";
    errors.push(`db: ${e instanceof Error ? e.message : String(e)}`);
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      ...(errors.length ? { errors } : {}),
    },
    { status: allOk ? 200 : 503 }
  );
}
