import { requireAppUser } from "@/lib/api/require-app-user";
import { chatwootForTenant } from "@/lib/api/conversations-service";
import { mapConversa } from "@/lib/api/chatwoot-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/app/conversations/[id] — conversa espelhada (resumo + timeline). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return Response.json({ error: "bad_id" }, { status: 400, headers: NO_STORE });
  try {
    const cw = await chatwootForTenant(ctx.tenantId);
    const [conv, msgs] = await Promise.all([cw.getConversation(id), cw.getMessages(id)]);
    return Response.json(mapConversa(conv, msgs), { headers: NO_STORE });
  } catch (e) {
    return Response.json({ error: "upstream", detail: String(e) }, { status: 502, headers: NO_STORE });
  }
}
