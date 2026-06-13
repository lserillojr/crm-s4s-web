import { requireAppUser } from "@/lib/api/require-app-user";
import { chatwootForTenant } from "@/lib/api/conversations-service";
import { isHandoff, mapListItem } from "@/lib/api/chatwoot-map";
import { upstreamError } from "@/lib/api/upstream-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/app/conversations?filter=todas|needs_you (default needs_you). */
export async function GET(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const filter = new URL(req.url).searchParams.get("filter") === "todas" ? "todas" : "needs_you";
  try {
    const cw = await chatwootForTenant(ctx.tenantId);
    const all = await cw.listOpenConversations();
    const selecionadas = filter === "todas" ? all : all.filter(isHandoff);
    return Response.json(selecionadas.map(mapListItem), { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
