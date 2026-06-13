import { requireAppUser } from "@/lib/api/require-app-user";
import { callAgendaService } from "@/lib/ai-service";
import { AppRescheduleInput } from "@/lib/agenda/app-contract";
import { upstreamError } from "@/lib/api/upstream-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** POST /api/app/agenda/appointments/[id]/reschedule — novo horário (60 min fixos no backend). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }
  const parsed = AppRescheduleInput.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 422, headers: NO_STORE });
  }

  try {
    const r = await callAgendaService(
      `/agenda/appointments/${encodeURIComponent(params.id)}/reschedule?tenant=${encodeURIComponent(ctx.tenantId)}`,
      { method: "POST", body: JSON.stringify({ new_slot_iso: parsed.data.novoInicioISO }) },
    );
    if (!r.ok) return upstreamError(`agenda/reschedule upstream status ${r.status}`);
    return Response.json(await r.json(), { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
