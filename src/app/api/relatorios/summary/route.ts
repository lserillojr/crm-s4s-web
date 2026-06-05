import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";
import type { RelatoriosSummary } from "@/lib/relatorios/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Proxy autenticado pro WF n8n "Relatórios — Resumo". Espelha o padrão do
 * /api/dashboard/summary (7.5): `requireApiTenant` (auth + tenant) + `callAiService`
 * (token x-ai-service-token, timeout, no-store). Diferença vs dashboard: os números
 * do contrato são non-null, então em falha do WF NÃO degradamos para zeros (seria
 * enganoso — "A IA atendeu 0 clientes"); devolvemos 502 e a tela mostra estado de erro.
 */

/** O seletor do Portal só oferece 7 ou 30 dias; qualquer outro valor cai no default 30. */
function parseDays(raw: string | null): 7 | 30 {
  return raw === "7" ? 7 : 30;
}

export async function GET(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const days = parseDays(new URL(req.url).searchParams.get("days"));

  const result = await callAiService<RelatoriosSummary>({
    path: "/relatorios/api/v1/summary",
    body: { tenant_id: ctx.tenantId, days },
  });

  if (!result.ok) {
    console.warn("[relatorios/summary] upstream", {
      tenantId: ctx.tenantId,
      reason: result.reason,
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.data, { status: 200, headers: NO_STORE });
}
