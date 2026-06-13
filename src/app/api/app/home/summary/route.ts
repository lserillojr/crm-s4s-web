import { requireAppUser } from "@/lib/api/require-app-user";
import { callAiService } from "@/lib/api/ai-service";
import { relatoriosSummarySchema, type RelatoriosSummary } from "@/lib/relatorios/contract";
import { toAppHomeSummary } from "@/lib/app-home/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/app/home/summary — números do dia da Home do app ("A IA hoje").
 * Reusa o WF n8n "Relatórios — Resumo" com days:1 e recorta para 3 números.
 * Auth pelo Bearer do Keycloak (app nativo). Em falha do WF: 502 (não degrada
 * para zeros — "A IA atendeu 0" seria enganoso). Payload enxuto, sem stack base.
 */
export async function GET(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  const result = await callAiService<RelatoriosSummary>({
    path: "/relatorios/api/v1/summary",
    body: { tenant_id: ctx.tenantId, days: 1 },
  });

  if (!result.ok) {
    console.warn("[app/home/summary] upstream", { tenantId: ctx.tenantId, reason: result.reason });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }

  const parsed = relatoriosSummarySchema.safeParse(result.data);
  if (!parsed.success) {
    console.warn("[app/home/summary] shape inválido", { tenantId: ctx.tenantId });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }

  return Response.json(toAppHomeSummary(parsed.data), { status: 200, headers: NO_STORE });
}
