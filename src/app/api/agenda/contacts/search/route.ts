import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Proxy autenticado → FastAPI AgendaService — autocomplete de contatos Odoo.
 *
 * O tenantId vem SEMPRE da sessão server-side (nunca do cliente).
 * O parâmetro `term` (mínimo 2 chars) é repassado ao FastAPI como query param.
 * Retorna shape ContactSearchResult: { results: ContactSuggestion[] }.
 */
export async function GET(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const term = new URL(req.url).searchParams.get("term") ?? "";
  if (term.trim().length < 2) {
    return Response.json({ results: [] }, { headers: NO_STORE });
  }

  try {
    const r = await callAgendaService(
      `/agenda/contacts/search?tenant=${encodeURIComponent(ctx.tenantId)}&term=${encodeURIComponent(term)}`,
    );
    if (!r.ok) return Response.json({ results: [] }, { headers: NO_STORE });
    return Response.json(await r.json(), { headers: NO_STORE });
  } catch {
    return Response.json({ results: [] }, { headers: NO_STORE });
  }
}
