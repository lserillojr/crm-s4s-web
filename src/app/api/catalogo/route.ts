import { z } from "zod";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { getPool } from "@/lib/db/pool";
import { rowToProduct } from "@/lib/catalogo/row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// ─────────────────────────────────────────────
// GET /api/catalogo
// ─────────────────────────────────────────────
export async function GET(_req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const pool = getPool();
  // Returns ALL states (active + drafts + archived) — Portal management screen needs drafts.
  // WF06/Task 7 filters is_active=true separately when building the AI catalog context.
  const { rows } = await pool.query(
    `SELECT id, tenant_id, key, title, description, price_brl, category,
            attributes, source, is_active, sort_order, created_at, updated_at
       FROM tenant_product_catalog
      WHERE tenant_id = $1
      ORDER BY sort_order ASC, created_at ASC`,
    [ctx.tenantId],
  );

  return Response.json(
    { products: rows.map(rowToProduct) },
    { status: 200, headers: NO_STORE },
  );
}

// ─────────────────────────────────────────────
// POST /api/catalogo — create a new product
// ─────────────────────────────────────────────
const createSchema = z.object({
  key: z.string().min(1).max(120),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  priceBrl: z.number().nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400, headers: NO_STORE },
    );
  }

  const {
    key,
    title,
    description = null,
    priceBrl = null,
    category = null,
    attributes = {},
    isActive = false,
    sortOrder = 0,
  } = parsed.data;

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO tenant_product_catalog
         (tenant_id, key, title, description, price_brl, category, attributes, source, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8, $9)
       RETURNING id, tenant_id, key, title, description, price_brl, category,
                 attributes, source, is_active, sort_order, created_at, updated_at`,
      [ctx.tenantId, key, title, description, priceBrl, category, JSON.stringify(attributes), isActive, sortOrder],
    );

    return Response.json(
      { product: rowToProduct(rows[0]!) },
      { status: 201, headers: NO_STORE },
    );
  } catch (err: unknown) {
    // PostgreSQL unique violation: 23505
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return Response.json(
        { error: "key_already_exists" },
        { status: 409, headers: NO_STORE },
      );
    }
    throw err;
  }
}
