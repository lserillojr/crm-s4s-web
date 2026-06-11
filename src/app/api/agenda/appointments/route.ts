import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";
import { CreateAppointmentInput } from "@/lib/agenda/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/agenda/appointments — cria agendamento manual.
 * O tenantId vem SEMPRE da sessão. Conflito de horário (constraint do banco)
 * sobe como 409 → a tela mostra "horário ocupado".
 */
export async function POST(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const parsed = CreateAppointmentInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 422, headers: NO_STORE },
    );
  }
  const { startIso, durationMin, contactName, contactPhone, title } = parsed.data;

  try {
    const r = await callAgendaService(
      `/agenda/appointments?tenant=${encodeURIComponent(ctx.tenantId)}`,
      {
        method: "POST",
        body: JSON.stringify({
          start: startIso,
          duration_min: durationMin,
          contact_name: contactName ?? null,
          contact_phone: contactPhone ?? null,
          title: title ?? null,
        }),
      },
    );

    if (r.status === 409) {
      return Response.json({ error: "slot_ocupado" }, { status: 409, headers: NO_STORE });
    }
    if (!r.ok) {
      console.warn("[agenda/appointments POST] upstream erro", { tenantId: ctx.tenantId, status: r.status });
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }
    return Response.json(await r.json(), { status: r.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/appointments POST] erro", {
      tenantId: ctx.tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
