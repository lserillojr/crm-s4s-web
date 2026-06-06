import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";
import { RescheduleInput } from "@/lib/agenda/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/agenda/appointments/[id]/reschedule
 * Remarca um agendamento para um novo slot.
 * Body: { newSlotIso }  (RescheduleInput — datetime ISO 8601)
 * O tenantId vem SEMPRE da sessão — nunca do cliente.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const { id } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const parsed = RescheduleInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 422, headers: NO_STORE },
    );
  }

  const { newSlotIso } = parsed.data;

  try {
    const r = await callAgendaService(
      `/agenda/appointments/${encodeURIComponent(id)}/reschedule?tenant=${encodeURIComponent(ctx.tenantId)}`,
      {
        method: "POST",
        body: JSON.stringify({ new_slot_iso: newSlotIso }),
      },
    );

    if (!r.ok) {
      console.warn("[agenda/appointments/reschedule POST] upstream erro", {
        tenantId: ctx.tenantId,
        appointmentId: id,
        status: r.status,
      });
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }

    return Response.json(await r.json(), { status: r.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/appointments/reschedule POST] erro", {
      tenantId: ctx.tenantId,
      appointmentId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
