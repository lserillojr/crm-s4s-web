import type { NextRequest } from "next/server";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";
import {
  followupConfigDefaults,
  followupConfigSchema,
  type FollowupConfig,
} from "@/lib/followup/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const GET_PATH = "/followup-config/api/v1/get";
const SAVE_PATH = "/followup-config/api/v1/save";

type GetWfResponse = { config?: unknown };

export async function GET(_req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const result = await callAiService<GetWfResponse>({
    path: GET_PATH,
    body: { tenant_id: ctx.tenantId },
  });

  if (!result.ok) {
    return Response.json(
      { config: followupConfigDefaults, loaded: false },
      { status: 200, headers: NO_STORE },
    );
  }

  if (result.data.config == null) {
    return Response.json(
      { config: followupConfigDefaults, loaded: true },
      { status: 200, headers: NO_STORE },
    );
  }

  const parsed = followupConfigSchema.safeParse(result.data.config);
  if (!parsed.success) {
    return Response.json(
      { config: followupConfigDefaults, loaded: false },
      { status: 200, headers: NO_STORE },
    );
  }

  return Response.json(
    { config: parsed.data, loaded: true },
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

  const parsed = followupConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE },
    );
  }

  const config: FollowupConfig = parsed.data;
  const result = await callAiService({
    path: SAVE_PATH,
    method: "PUT",
    body: { tenant_id: ctx.tenantId, config },
  });

  if (!result.ok) {
    return Response.json(
      { error: "save_failed", reason: result.reason },
      { status: 502, headers: NO_STORE },
    );
  }

  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}
