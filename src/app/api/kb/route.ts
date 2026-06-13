import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAiService } from "@/lib/api/ai-service";
import { composeKb, mergeEditable, initSections, kbByteLength } from "@/lib/kb/compose";
import type { KbSection } from "@/lib/kb/types";
import { resolveStagePlaceholders } from "@/lib/kb/placeholders";
import { fetchRoleToName } from "@/lib/funil/role-to-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BYTES = 50 * 1024;

type GetRaw = {
  sections: KbSection[] | null;
  sectionsPrevious: KbSection[] | null;
  vertical: string | null;
  legacyContent: string | null;
  updatedAt: string | null;
};

async function fetchRaw(tenantId: string) {
  return callAiService<GetRaw>({ path: "/kb/api/v1/get", body: { tenant_id: tenantId } });
}

function resolveSections(raw: GetRaw): KbSection[] {
  return raw.sections ?? initSections(raw.vertical ?? "outro", raw.legacyContent ?? "");
}

export async function GET(_req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const r = await fetchRaw(ctx.tenantId);
  if (!r.ok) return Response.json({ error: "kb_unavailable" }, { status: 502, headers: NO_STORE });

  return Response.json(
    { sections: resolveSections(r.data), hasPrevious: r.data.sectionsPrevious != null, updatedAt: r.data.updatedAt },
    { status: 200, headers: NO_STORE },
  );
}

const putSchema = z.object({
  editable: z.record(z.string(), z.string().trim().min(1, "Bloco não pode ficar vazio")),
});

export async function PUT(req: NextRequest) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid", issues: parsed.error.issues }, { status: 400, headers: NO_STORE });
  }

  const r = await fetchRaw(ctx.tenantId);
  if (!r.ok) return Response.json({ error: "kb_unavailable" }, { status: 502, headers: NO_STORE });

  const current = resolveSections(r.data);
  const merged = mergeEditable(current, parsed.data.editable);
  // Resolve {{etapa:role}} contra os labels atuais do tenant (2B). Falha → map {} (placeholders
  // viram vazio). As `sections` salvas ficam cruas; só o `content` (o que a IA lê) é resolvido.
  const roleToName = await fetchRoleToName(ctx.tenantId);
  const content = resolveStagePlaceholders(composeKb(merged), roleToName);

  if (kbByteLength(content) > MAX_BYTES) {
    return Response.json({ error: "too_large", maxBytes: MAX_BYTES }, { status: 400, headers: NO_STORE });
  }

  const saved = await callAiService<{ ok: boolean; updatedAt: string }>({
    path: "/kb/api/v1/save",
    body: { tenant_id: ctx.tenantId, sections: merged, content },
  });
  if (!saved.ok) return Response.json({ error: "kb_save_failed" }, { status: 502, headers: NO_STORE });

  return Response.json({ ok: true, updatedAt: saved.data.updatedAt }, { status: 200, headers: NO_STORE });
}
