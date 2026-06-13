import type { CatalogProduct } from "./types";

/** Convert a DB row (snake_case) to CatalogProduct (camelCase).
 *  price_brl is NUMERIC — pg returns it as string; convert to number or null. */
export function rowToProduct(row: Record<string, unknown>): CatalogProduct {
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
