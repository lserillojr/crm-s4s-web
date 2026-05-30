import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/pool";
import { getIntegrationHealth } from "@/lib/integrations/get-integration-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return Response.json({ error: "unauth" }, { status: 401 });
  }
  const health = await getIntegrationHealth(getPool(), session.user.tenantId);
  return Response.json(health, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
