import { z } from "zod";
import { requireApiTenant } from "@/lib/api/require-tenant";
import { getPool } from "@/lib/db/pool";
import { rowToProduct } from "@/lib/catalogo/row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// ─────────────────────────────────────────────
// PUT /api/catalogo/[id] — update a product
// ─────────────────────────────────────────────

/** At least one of these fields must be present for a valid update. */
const updateSchema = z
  .object({
    key: z.string().min(1).max(120).optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    priceBrl: z.number().nullable().optional(),
    category: z.string().max(80).nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (d) => Object.keys(d).length > 0,
    { message: "Pelo menos um campo deve ser enviado" },
  );

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiTenant();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400, headers: NO_STORE },
    );
  }

  const data = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (data.key !== undefined) {
    setClauses.push(`key = $${paramIdx++}`);
    values.push(data.key);
  }
  if (data.title !== undefined) {
    setClauses.push(`title = $${paramIdx++}`);
    values.push(data.title);
  }
  if ("description" in data) {
    setClauses.push(`description = $${paramIdx++}`);
    values.push(data.description ?? null);
  }
  if ("priceBrl" in data) {
    setClauses.push(`price_brl = $${paramIdx++}`);
    values.push(data.priceBrl ?? null);
  }
  if ("category" in data) {
    setClauses.push(`category = $${paramIdx++}`);
    values.push(data.category ?? null);
  }
  if (data.attributes !== undefined) {
    setClauses.push(`attributes = $${paramIdx++}`);
    values.push(JSON.stringify(data.attributes));
  }
  if (data.isActive !== undefined) {
    setClauses.push(`is_active = $${paramIdx++}`);
    values.push(data.isActive);
  }
  if (data.sortOrder !== undefined) {
    setClauses.push(`sort_order = $${paramIdx++}`);
    values.push(data.sortOrder);
  }

  // Always bump updated_at
  setClauses.push(`updated_at = NOW()`);

  // Scope by BOTH id AND tenant_id — tenant isolation is non-negotiable
  values.push(id);           // $paramIdx
  values.push(auth.tenantId); // $paramIdx+1
  const idParam = paramIdx;
  const tenantParam = paramIdx + 1;

  const pool = getPool();
  let rows: Record<string, unknown>[];
  try {
    const result = await pool.query(
      `UPDATE tenant_product_catalog
          SET ${setClauses.join(", ")}
        WHERE id = $${idParam}
          AND tenant_id = $${tenantParam}
        RETURNING id, tenant_id, key, title, description, price_brl, category,
                  attributes, source, is_active, sort_order, created_at, updated_at`,
      values,
    );
    rows = result.rows;
  } catch (err: unknown) {
    // PostgreSQL unique violation: renaming key collides with an existing (tenant_id, key)
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

  if (rows.length === 0) {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json(
    { product: rowToProduct(rows[0]!) },
    { status: 200, headers: NO_STORE },
  );
}

// ─────────────────────────────────────────────
// DELETE /api/catalogo/[id] — soft-delete
// ─────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiTenant();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  const pool = getPool();
  // Soft-delete: set is_active=false, scoped by BOTH id AND tenant_id
  const { rows } = await pool.query(
    `UPDATE tenant_product_catalog
        SET is_active = false,
            updated_at = NOW()
      WHERE id = $1
        AND tenant_id = $2
      RETURNING id`,
    [id, auth.tenantId],
  );

  if (rows.length === 0) {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}
