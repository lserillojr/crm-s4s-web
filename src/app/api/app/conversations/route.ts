import { requireAppUser } from "@/lib/api/require-app-user";
import { chatwootForTenant } from "@/lib/api/conversations-service";
import { isHandoff, mapListItem } from "@/lib/api/chatwoot-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/app/conversations?status=handoff — conversas em handoff do tenant. */
export async function GET(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  try {
    const cw = await chatwootForTenant(ctx.tenantId);
    const all = await cw.listOpenConversations();
    const items = all.filter(isHandoff).map(mapListItem);
    return Response.json(items, { headers: NO_STORE });
  } catch (e) {
    return Response.json({ error: "upstream", detail: String(e) }, { status: 502, headers: NO_STORE });
  }
}
