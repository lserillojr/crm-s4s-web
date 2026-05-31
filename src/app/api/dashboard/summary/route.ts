import { auth } from "@/auth";
import { env } from "@/lib/env";

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

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return Response.json({ error: "unauth" }, { status: 401 });
  }
  const userName = session.user.name ?? "";
  const base = env.N8N_API_BASE_URL?.replace(/\/+$/, "");
  const token = env.N8N_AI_SERVICE_TOKEN;
  try {
    const resp = await fetch(`${base}/dashboard/api/v1/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ai-service-token": token ?? "" },
      body: JSON.stringify({ tenant_id: session.user.tenantId }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.warn("[dashboard/summary] WF non-200", { status: resp.status });
      return Response.json(degraded(userName), { status: 200 });
    }
    const wf = (await resp.json()) as DashboardSummary;
    wf.greeting = { userName, businessName: wf.greeting?.businessName ?? "" };
    return Response.json(wf, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[dashboard/summary] WF fetch failed", {
      tenantId: session.user.tenantId,
      isAbort: err instanceof Error && err.name === "TimeoutError",
    });
    return Response.json(degraded(userName), { status: 200 });
  }
}
