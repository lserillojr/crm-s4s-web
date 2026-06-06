import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { agendaItemSchema } from "@/lib/agenda/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Leitura da Agenda (Onda 1 — só-leitura). Lê os NOSSOS `appointments` e
 * `availability_blocks` direto do Postgres (o mesmo banco do tenant lookup),
 * SEMPRE filtrando por `ctx.tenantId` (isolamento crítico em código).
 *
 * Onda 1 lê direto via drizzle de propósito: a tela não depende de WF n8n nem
 * de expor o FastAPI. Na Onda 2, quando a IA passar a escrever via AgendaService
 * (crm-s4s-ai) e a verdade dos slots migrar pro nosso storage, troca-se só a
 * fonte aqui — o contrato/hook/tela não mudam. Ver endpoint canônico
 * `GET /agenda/list` (crm-s4s-ai/routes/agenda.py).
 */

type Row = {
  id: string;
  start_at: Date;
  end_at: Date;
  contact_name: string | null;
  status: string;
  source: string;
};
type BlockRow = {
  id: string;
  start_at: Date;
  end_at: Date;
  reason: string | null;
};

/** Default seguro: janela de 7 dias a partir do "from" recebido, ou hoje. */
function parseRange(req: Request): { from: string; to: string } {
  const params = new URL(req.url).searchParams;
  const from = params.get("from") || new Date().toISOString().slice(0, 10);
  const to =
    params.get("to") ||
    new Date(Date.parse(from) + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  return { from, to };
}

export async function GET(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const { from, to } = parseRange(req);

  try {
    const appts = (await db.execute(sql`
      SELECT id, start_at, end_at, contact_name, status, source
      FROM appointments
      WHERE tenant_id = ${ctx.tenantId}
        AND start_at >= ${from} AND start_at < ${to}
        AND status <> 'cancelado'
      ORDER BY start_at
    `)) as unknown as Row[];

    const blocks = (await db.execute(sql`
      SELECT id, start_at, end_at, reason
      FROM availability_blocks
      WHERE tenant_id = ${ctx.tenantId}
        AND start_at >= ${from} AND start_at < ${to}
      ORDER BY start_at
    `)) as unknown as BlockRow[];

    const payload = agendaItemSchema.parse({
      appointments: appts.map((r) => ({
        id: String(r.id),
        start: new Date(r.start_at).toISOString(),
        end: new Date(r.end_at).toISOString(),
        contactName: r.contact_name,
        status: r.status,
        source: r.source,
      })),
      blocks: blocks.map((b) => ({
        id: String(b.id),
        start: new Date(b.start_at).toISOString(),
        end: new Date(b.end_at).toISOString(),
        reason: b.reason,
      })),
    });

    return Response.json(payload, { status: 200, headers: NO_STORE });
  } catch (err) {
    console.warn("[agenda/list] erro", {
      tenantId: ctx.tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
