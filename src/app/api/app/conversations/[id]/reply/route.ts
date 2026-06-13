import { z } from "zod";
import { requireAppUser } from "@/lib/api/require-app-user";
import { upstreamError } from "@/lib/api/upstream-error";
import { chatwootForTenant } from "@/lib/api/conversations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const Body = z.object({ texto: z.string().min(1) });

/** POST /reply — posta como agente (sem carimbo s4s_ai_sent) E pausa a IA. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "bad_id" }, { status: 400, headers: NO_STORE });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  try {
    const cw = await chatwootForTenant(ctx.tenantId);
    await cw.postReply(id, parsed.data.texto);
    await cw.setAiState(id, "escalated");
    return Response.json({ ok: true, status: "posse", aiState: "escalated" }, { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
