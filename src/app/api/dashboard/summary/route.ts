import type { NextRequest } from "next/server";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type DashboardSummary = {
  greeting: { userName: string; businessName: string };
  weekConversations: number | null;
  conversationsToday: { count: number; trend: "up" | "down" | "flat"; vsYesterday: number } | null;
  leadsNew: { count: number; names: string[] } | null;
  nextMeeting: { withName: string; whenISO: string; topic: string } | null;
};

function degraded(userName: string): DashboardSummary {
  return {
    greeting: { userName, businessName: "" },
    weekConversations: null, conversationsToday: null, leadsNew: null, nextMeeting: null,
  };
}

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const result = await callAiService<DashboardSummary>({
    path: "/dashboard/api/v1/summary",
    body: { tenant_id: ctx.tenantId },
  });

  if (!result.ok) {
    console.warn("[dashboard/summary] degraded", { tenantId: ctx.tenantId, reason: result.reason });
    return Response.json(degraded(ctx.userName), { status: 200, headers: NO_STORE });
  }

  const wf = result.data;
  return Response.json(
    { ...wf, greeting: { userName: ctx.userName, businessName: wf.greeting?.businessName ?? "" } },
    { status: 200, headers: NO_STORE },
  );
}
