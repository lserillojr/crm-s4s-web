import { describe, it, expect, vi } from "vitest";
import { getTenantIdByAccountId } from "@/lib/db/tenants";

function makeMockClient(rows: unknown[] = []) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}
type Client = Parameters<typeof getTenantIdByAccountId>[0];

describe("getTenantIdByAccountId", () => {
  it("SELECT id FROM tenants WHERE chatwoot_account_id = $1 LIMIT 1", async () => {
    const c = makeMockClient([{ id: "ten-1" }]);
    const r = await getTenantIdByAccountId(c as unknown as Client, 34);
    const [sql, params] = c.query.mock.calls[0]!;
    expect(sql).toMatch(/SELECT\s+id\s+FROM\s+tenants\s+WHERE\s+chatwoot_account_id\s*=\s*\$1\s+LIMIT\s+1/i);
    expect(params).toEqual([34]);
    expect(r).toBe("ten-1");
  });
  it("null quando não há tenant", async () => {
    const c = makeMockClient([]);
    expect(await getTenantIdByAccountId(c as unknown as Client, 99)).toBeNull();
  });
});
