import { requireAppUser } from "@/lib/api/require-app-user";
import { callAgendaService } from "@/lib/ai-service";
import { upstreamError } from "@/lib/api/upstream-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** POST /api/app/agenda/appointments/[id]/cancel — cancela o compromisso. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  try {
    const r = await callAgendaService(
      `/agenda/appointments/${encodeURIComponent(params.id)}/cancel?tenant=${encodeURIComponent(ctx.tenantId)}`,
      { method: "POST" },
    );
    if (!r.ok) return upstreamError(`agenda/cancel upstream status ${r.status}`);
    return Response.json(await r.json(), { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
