import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/agenda/appointments/[id]/cancel
 * Cancela um agendamento existente para o tenant autenticado.
 * O tenantId vem SEMPRE da sessão — nunca do cliente.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const { id } = params;

  try {
    const r = await callAgendaService(
      `/agenda/appointments/${encodeURIComponent(id)}/cancel?tenant=${encodeURIComponent(ctx.tenantId)}`,
      { method: "POST" },
    );

    if (!r.ok) {
      console.warn("[agenda/appointments/cancel POST] upstream erro", {
        tenantId: ctx.tenantId,
        appointmentId: id,
        status: r.status,
      });
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }

    return Response.json(await r.json(), { status: r.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/appointments/cancel POST] erro", {
      tenantId: ctx.tenantId,
      appointmentId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
