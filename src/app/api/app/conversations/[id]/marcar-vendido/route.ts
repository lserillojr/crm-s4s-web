import { requireAppUser } from "@/lib/api/require-app-user";
import { upstreamError } from "@/lib/api/upstream-error";
import { marcarVendido } from "@/lib/api/conversations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** POST /marcar-vendido — dono fecha: move p/ Venda Fechada (role `venda`) + grava R$. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "bad_id" }, { status: 400, headers: NO_STORE });
  }
  let valorBrl: number | null = null;
  const body = await req.json().catch(() => ({}));
  if (typeof body?.valorBrl === "number" && body.valorBrl > 0) valorBrl = body.valorBrl;
  try {
    await marcarVendido(ctx.tenantId, id, valorBrl);
    return Response.json({ ok: true, status: "vendido" }, { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
