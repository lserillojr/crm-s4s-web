import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";
import { BlockInput } from "@/lib/agenda/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/agenda/blocks
 * Cria um bloqueio de horário para o tenant autenticado.
 * Body: { start, end, reason? }  (BlockInput)
 *
 * DELETE /api/agenda/blocks?id={block_id}
 * Remove um bloqueio existente.
 */

export async function POST(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const parsed = BlockInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 422, headers: NO_STORE },
    );
  }

  const { start, end, reason } = parsed.data;

  try {
    const r = await callAgendaService(
      `/agenda/blocks?tenant=${encodeURIComponent(ctx.tenantId)}`,
      {
        method: "POST",
        body: JSON.stringify({ start, end, reason }),
      },
    );

    if (!r.ok) {
      console.warn("[agenda/blocks POST] upstream erro", {
        tenantId: ctx.tenantId,
        status: r.status,
      });
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }

    return Response.json(await r.json(), { status: r.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/blocks POST] erro", {
      tenantId: ctx.tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}

export async function DELETE(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "missing_id" }, { status: 400, headers: NO_STORE });
  }

  try {
    const r = await callAgendaService(
      `/agenda/blocks/${encodeURIComponent(id)}?tenant=${encodeURIComponent(ctx.tenantId)}`,
      { method: "DELETE" },
    );

    if (!r.ok) {
      console.warn("[agenda/blocks DELETE] upstream erro", {
        tenantId: ctx.tenantId,
        blockId: id,
        status: r.status,
      });
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }

    return Response.json(await r.json(), { status: r.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/blocks DELETE] erro", {
      tenantId: ctx.tenantId,
      blockId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
