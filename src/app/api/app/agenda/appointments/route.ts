import { requireAppUser } from "@/lib/api/require-app-user";
import { callAgendaService } from "@/lib/ai-service";
import { AppCreateAppointmentInput, toAgendaServiceBody } from "@/lib/agenda/app-contract";
import { upstreamError } from "@/lib/api/upstream-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** POST /api/app/agenda/appointments — cria compromisso. 409 = horário ocupado. */
export async function POST(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }
  const parsed = AppCreateAppointmentInput.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 422, headers: NO_STORE });
  }

  try {
    const r = await callAgendaService(`/agenda/appointments?tenant=${encodeURIComponent(ctx.tenantId)}`, {
      method: "POST",
      body: JSON.stringify(toAgendaServiceBody(parsed.data)),
    });
    if (r.status === 409) return Response.json({ error: "slot_ocupado" }, { status: 409, headers: NO_STORE });
    if (!r.ok) return upstreamError(`agenda/appointments upstream status ${r.status}`);
    return Response.json(await r.json(), { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
