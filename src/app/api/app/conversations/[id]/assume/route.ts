import { requireAppUser } from "@/lib/api/require-app-user";
import { chatwootForTenant } from "@/lib/api/conversations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** POST /assume — humano assume: pausa a IA (ai_state=escalated). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "bad_id" }, { status: 400, headers: NO_STORE });
  try {
    const cw = await chatwootForTenant(ctx.tenantId);
    await cw.setAiState(id, "escalated");
    return Response.json({ ok: true, status: "posse", aiState: "escalated" }, { headers: NO_STORE });
  } catch (e) {
    return Response.json({ error: "upstream", detail: String(e) }, { status: 502, headers: NO_STORE });
  }
}
