import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantCalendarInfo } from "@/lib/db/gcal-tokens";
import { getPool } from "@/lib/db/pool";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new Response(JSON.stringify({ error: "unauth" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const info = await getTenantCalendarInfo(getPool(), session.user.tenantId);
  return Response.json(info);
}
