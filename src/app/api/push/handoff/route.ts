import { z } from "zod";
import { getPool } from "@/lib/db/pool";
import { getTokensForTenantOwner, deleteTokens } from "@/lib/db/device-tokens";
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

interface QueryRunner {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}
async function resolveTenantId(client: QueryRunner, accountId: number): Promise<string | null> {
  const { rows } = await client.query(`SELECT id FROM tenants WHERE chatwoot_account_id = $1 LIMIT 1`, [accountId]);
  return rows[0] ? (rows[0].id as string) : null;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-push-secret") ?? "";
  if (!env.PUSH_WEBHOOK_SECRET || secret !== env.PUSH_WEBHOOK_SECRET) {
    return Response.json({ error: "unauth" }, { status: 401, headers: NO_STORE });
  }
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  const b = parsed.data;

  const pool = getPool();
  const tenantId = await resolveTenantId(pool as unknown as QueryRunner, b.account_id);
  if (!tenantId) return Response.json({ skipped: "tenant_not_found" }, { status: 200, headers: NO_STORE });

  const tokens = await getTokensForTenantOwner(pool as unknown as QueryRunner, tenantId);
  if (tokens.length === 0) return Response.json({ skipped: "no_devices" }, { status: 200, headers: NO_STORE });

  const { deadTokens } = await sendPush(tokens, {
    title: b.titulo,
    body: b.corpo,
    silent: b.silencioso,
    data: { type: "handoff", account_id: b.account_id, conversation_id: b.conversation_id, tenant_slug: b.tenant_slug, tipo: b.tipo },
  });
  if (deadTokens.length) await deleteTokens(pool as unknown as QueryRunner, deadTokens);

  return Response.json({ sent: true, count: tokens.length, pruned: deadTokens.length }, { status: 200, headers: NO_STORE });
}
