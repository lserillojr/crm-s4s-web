import { z } from "zod";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { getPool } from "@/lib/db/pool";
import type { CatalogProduct } from "@/lib/catalogo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Convert a DB row (snake_case) to CatalogProduct (camelCase).
 *  price_brl is NUMERIC — pg returns it as string; convert to number or null. */
function rowToProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: row.id as string,
    key: row.key as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    priceBrl:
      row.price_brl == null ? null : Number(row.price_brl),
    category: (row.category as string | null) ?? null,
    attributes: (row.attributes as Record<string, unknown>) ?? {},
    source: row.source as string,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
  };
}

// ─────────────────────────────────────────────
// GET /api/catalogo
// ─────────────────────────────────────────────
export async function GET(_req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const pool = getPool();
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
  } = parsed.data;

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO tenant_product_catalog
         (tenant_id, key, title, description, price_brl, category, attributes, source, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8, 0)
       RETURNING id, tenant_id, key, title, description, price_brl, category,
                 attributes, source, is_active, sort_order, created_at, updated_at`,
      [ctx.tenantId, key, title, description, priceBrl, category, JSON.stringify(attributes), isActive],
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
