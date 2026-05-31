import type { NextRequest } from "next/server";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";
import {
  weeklyHoursDefaults,
  weeklyHoursSchema,
  type WeeklyHours,
} from "@/lib/working-hours/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Horário de atendimento do tenant — proxy autenticado ao WF de Business Hours
 * do Chatwoot (Story 7.6 fase 2). Contrato com o n8n (espelha dashboard/KB):
 *   GET  → POST /working-hours/api/v1/get   { tenant_id }            → { weekly_hours }
 *   PUT  → PUT  /working-hours/api/v1/save   { tenant_id, weekly_hours }
 *
 * A tradução pro shape nativo do Chatwoot (working_hours[] por inbox, day_of_week
 * 0-6, open_hour/close_minutes...) vive no WF, não aqui — a camada web fala só o
 * domínio WeeklyHours. working_hours filtra os slots que a IA oferece, então o
 * save precisa ser confiável: ele NÃO degrada em silêncio (ver project_arch_ia_24x7).
 */

const GET_PATH = "/working-hours/api/v1/get";
const SAVE_PATH = "/working-hours/api/v1/save";

type GetWfResponse = { weekly_hours?: unknown };

export async function GET(_req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const result = await callAiService<GetWfResponse>({
    path: GET_PATH,
    body: { tenant_id: ctx.tenantId },
  });

  if (!result.ok) {
    console.warn("[working-hours] get degraded", {
      tenantId: ctx.tenantId,
      reason: result.reason,
    });
    return Response.json(
      { weeklyHours: weeklyHoursDefaults, loaded: false },
      { status: 200, headers: NO_STORE },
    );
  }

  const parsed = weeklyHoursSchema.safeParse(result.data.weekly_hours);
  if (!parsed.success) {
    console.warn("[working-hours] get invalid shape from WF", {
      tenantId: ctx.tenantId,
    });
    return Response.json(
      { weeklyHours: weeklyHoursDefaults, loaded: false },
      { status: 200, headers: NO_STORE },
    );
  }

  return Response.json(
    { weeklyHours: parsed.data, loaded: true },
    { status: 200, headers: NO_STORE },
  );
}

export async function PUT(req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = undefined;
  }

  const parsed = weeklyHoursSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE },
    );
  }

  const weeklyHours: WeeklyHours = parsed.data;
  const result = await callAiService({
    path: SAVE_PATH,
    method: "PUT",
    body: { tenant_id: ctx.tenantId, weekly_hours: weeklyHours },
  });

  if (!result.ok) {
    console.warn("[working-hours] save failed", {
      tenantId: ctx.tenantId,
      reason: result.reason,
    });
    return Response.json(
      { error: "save_failed", reason: result.reason },
      { status: 502, headers: NO_STORE },
    );
  }

  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}
