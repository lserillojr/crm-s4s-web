import type { NextRequest } from "next/server";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";
import { funilGetResponseSchema, renamePayloadSchema } from "@/lib/funil/schema";
import type { FunilStageRow } from "@/lib/funil/schema";
import { meaningForRole } from "@/lib/funil/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
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
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stage) => ({
      role: stage.s4s_role ?? null,
      meaning: meaningForRole(stage.s4s_role),
      name: stage.name,
      sequence: stage.sequence,
      isWon: stage.is_won,
      editable: !!stage.s4s_role,
    }));

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

  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}
