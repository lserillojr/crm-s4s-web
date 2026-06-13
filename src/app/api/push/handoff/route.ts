import { z } from "zod";
import { getPool } from "@/lib/db/pool";
import { getTokensForTenantOwner, deleteTokens } from "@/lib/db/device-tokens";
import { getTenantIdByAccountId } from "@/lib/db/tenants";
import { sendPush } from "@/lib/push/send";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const Schema = z.object({
  account_id: z.number().int(),
  conversation_id: z.number().int(),
  tenant_slug: z.string().min(1),
  tipo: z.enum(["escalacao", "lead_quente", "sla", "recutucada"]),
  titulo: z.string().min(1),
  corpo: z.string().default(""),
  silencioso: z.boolean().default(false),
});

export async function POST(req: Request) {
  const secret = req.headers.get("x-push-secret") ?? "";
  if (!env.PUSH_WEBHOOK_SECRET || secret !== env.PUSH_WEBHOOK_SECRET) {
    return Response.json({ error: "unauth" }, { status: 401, headers: NO_STORE });
  }
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  const b = parsed.data;

  const pool = getPool();
  const tenantId = await getTenantIdByAccountId(pool, b.account_id);
  if (!tenantId) return Response.json({ skipped: "tenant_not_found" }, { status: 200, headers: NO_STORE });

  const tokens = await getTokensForTenantOwner(pool, tenantId);
  if (tokens.length === 0) return Response.json({ skipped: "no_devices" }, { status: 200, headers: NO_STORE });

  // Lead quente (IA negociou e entregou pronto pra fechar): o push abre o app já
  // no campo "Marcar como vendido" (gate A1 — o MEI fecha de onde recebe o aviso).
  const acao = b.tipo === "lead_quente" ? "marcar-vendido" : undefined;
  const { deadTokens } = await sendPush(tokens, {
    title: b.titulo,
    body: b.corpo,
    silent: b.silencioso,
    data: {
      type: "handoff", account_id: b.account_id, conversation_id: b.conversation_id,
      tenant_slug: b.tenant_slug, tipo: b.tipo, ...(acao ? { acao } : {}),
    },
  });
  if (deadTokens.length) await deleteTokens(pool, deadTokens);

  return Response.json({ sent: true, count: tokens.length, pruned: deadTokens.length }, { status: 200, headers: NO_STORE });
}
