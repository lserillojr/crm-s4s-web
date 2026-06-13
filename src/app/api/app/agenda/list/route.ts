import { requireAppUser } from "@/lib/api/require-app-user";
import { callAgendaService } from "@/lib/ai-service";
import { agendaItemSchema } from "@/lib/agenda/contract";
import { mapAgendaItens, proximoDia } from "@/lib/agenda/app-contract";
import { upstreamError } from "@/lib/api/upstream-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/app/agenda/list?dia=YYYY-MM-DD (default hoje).
 * Espelha /api/agenda/list (web), mas autentica pelo Bearer do app e devolve
 * a lista LIMPA de um único dia, em horário de São Paulo (UTC-3 fixo).
 */
export async function GET(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  const dia = new URL(req.url).searchParams.get("dia") || new Date().toISOString().slice(0, 10);
  const from = `${dia}T00:00:00-03:00`;
  const to = `${proximoDia(dia)}T00:00:00-03:00`;

  try {
    const r = await callAgendaService(
      `/agenda/list?tenant=${encodeURIComponent(ctx.tenantId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (!r.ok) return upstreamError(`agenda/list upstream status ${r.status}`);
    const payload = agendaItemSchema.parse(await r.json());
    return Response.json(mapAgendaItens(payload), { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
