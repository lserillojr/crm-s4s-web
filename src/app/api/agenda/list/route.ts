import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";
import { agendaItemSchema } from "@/lib/agenda/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Proxy autenticado → FastAPI AgendaService (Onda 2).
 *
 * Substitui a leitura drizzle-direct da Onda 1: o tenantId vem SEMPRE da
 * sessão server-side (nunca do cliente), é repassado ao FastAPI como query
 * param `tenant`, e a resposta é validada contra o contrato Zod antes de
 * ser devolvida — garantindo que a tela nunca receba shape inesperado.
 *
 * A forma retornada (agendaItemSchema) e os parâmetros aceitos (from/to)
 * são idênticos à Onda 1 — o hook `useAgenda` e a tela não precisam mudar.
 *
 * O FastAPI retorna exatamente o mesmo shape do contrato (camelCase,
 * nullable contactName/reason) portanto não é necessário nenhum mapeamento.
 *
 * Ver endpoint canônico: GET /agenda/list (crm-s4s-ai/routes/agenda.py).
 */

/** Default seguro: janela de 7 dias a partir do "from" recebido, ou hoje. */
function parseRange(req: Request): { from: string; to: string } {
  const params = new URL(req.url).searchParams;
  const from = params.get("from") || new Date().toISOString().slice(0, 10);
  const to =
    params.get("to") ||
    new Date(Date.parse(from) + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  return { from, to };
}

export async function GET(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const { from, to } = parseRange(req);

  try {
    const r = await callAgendaService(
      `/agenda/list?tenant=${encodeURIComponent(ctx.tenantId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );

    if (!r.ok) {
      console.warn("[agenda/list] upstream erro", {
        tenantId: ctx.tenantId,
        status: r.status,
      });
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }

    const payload = agendaItemSchema.parse(await r.json());
    return Response.json(payload, { status: 200, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/list] erro", {
      tenantId: ctx.tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
