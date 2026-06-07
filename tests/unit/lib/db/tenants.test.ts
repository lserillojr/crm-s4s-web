import { describe, it, expect, vi } from "vitest";
import { getTenantIdByAccountId, getTenantChatwootCreds } from "@/lib/db/tenants";

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

describe("getTenantChatwootCreds", () => {
  it("devolve accountId numérico e token", async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ chatwoot_account_id: 2, chatwoot_api_token: "abc" }], rowCount: 1 }) };
    const out = await getTenantChatwootCreds(client, "t-1");
    expect(out).toEqual({ accountId: 2, apiToken: "abc" });
    const [sql, params] = client.query.mock.calls[0]!;
    expect(sql).toMatch(/SELECT.*chatwoot_account_id.*chatwoot_api_token.*FROM\s+tenants.*WHERE\s+id\s*=\s*\$1/is);
    expect(params).toEqual(["t-1"]);
  });
  it("null quando não acha", async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) };
    expect(await getTenantChatwootCreds(client, "x")).toBeNull();
  });
});
