import type { NextRequest } from "next/server";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";
import { funilGetResponseSchema, renamePayloadSchema } from "@/lib/funil/schema";
import type { FunilStageRow } from "@/lib/funil/schema";
import { meaningForRole, ROLE_ORDER } from "@/lib/funil/roles";
import { recomposeAndSaveKb } from "@/lib/kb/recompose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function orderIndex(role: string | null): number {
  const i = ROLE_ORDER.indexOf(role ?? "");
  return i === -1 ? 999 : i;
}
const GET_PATH = "/funil-config/api/v1/get";
const SAVE_PATH = "/funil-config/api/v1/save";

type GetWfResponse = { stages?: unknown[] };

export async function GET(_req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const result = await callAiService<GetWfResponse>({
    path: GET_PATH,
    body: { tenant_id: ctx.tenantId },
  });

  if (!result.ok) {
    console.warn("[funil-config] get degraded", {
      tenantId: ctx.tenantId,
      reason: result.reason,
    });
    return Response.json(
      { stages: [], loaded: false },
      { status: 200, headers: NO_STORE },
    );
  }

  const parsed = funilGetResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return Response.json(
      { stages: [], loaded: false },
      { status: 200, headers: NO_STORE },
    );
  }

  const rows: FunilStageRow[] = parsed.data.stages
    .map((stage) => ({
      role: stage.s4s_role ?? null,
      meaning: meaningForRole(stage.s4s_role),
      name: stage.name,
      sequence: stage.sequence,
      isWon: stage.is_won,
      editable: !!stage.s4s_role,
    }))
    .sort((a, b) => a.sequence - b.sequence || orderIndex(a.role) - orderIndex(b.role));

  return Response.json(
    { stages: rows, loaded: true },
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

  const parsed = renamePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE },
    );
  }

  const result = await callAiService({
    path: SAVE_PATH,
    method: "PUT",
    body: { tenant_id: ctx.tenantId, renames: parsed.data.renames },
  });

  if (!result.ok) {
    return Response.json(
      { error: "save_failed", reason: result.reason },
      { status: 502, headers: NO_STORE },
    );
  }

  // Best-effort: re-sincroniza o KB (Seção 8 por papel) com os novos labels — SÓ quando o WF
  // confirma que o rename foi aplicado (`ok:true`). Em falha parcial (ex.: colisão de nome) o WF
  // devolve 200 + `ok:false` e nada foi persistido → não recompõe. O rename já gravou no Odoo; se
  // o recompose falhar, loga e segue — não derruba o rename. (Story 2C)
  const wfOk = (result.data as { ok?: boolean } | null)?.ok === true;
  if (wfOk) {
    await recomposeAndSaveKb(ctx.tenantId);
  }

  return Response.json(result.data, { status: 200, headers: NO_STORE });
}
