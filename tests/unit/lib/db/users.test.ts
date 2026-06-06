import { describe, it, expect, vi } from "vitest";
import { getAppUserByEmail } from "@/lib/db/users";

function makeMockClient(rows: unknown[] = []) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}
type Client = Parameters<typeof getAppUserByEmail>[0];

describe("getAppUserByEmail", () => {
  it("resolve por lower(email), retorna userId + tenantId", async () => {
    const c = makeMockClient([{ id: "u-1", tenant_id: "ten-1" }]);
    const r = await getAppUserByEmail(c as unknown as Client, "Teste@S4S.dev");
    const [sql, params] = c.query.mock.calls[0]!;
    expect(sql).toMatch(/SELECT\s+id,\s*tenant_id\s+FROM\s+users/i);
    expect(sql).toMatch(/lower\(email\)\s*=\s*lower\(\$1\)/i);
    expect(params).toEqual(["Teste@S4S.dev"]);
    expect(r).toEqual({ userId: "u-1", tenantId: "ten-1" });
  });
  it("tenantId null quando user sem tenant", async () => {
    const c = makeMockClient([{ id: "u-2", tenant_id: null }]);
    expect(await getAppUserByEmail(c as unknown as Client, "x@y.z")).toEqual({ userId: "u-2", tenantId: null });
  });
  it("null quando user não existe", async () => {
    const c = makeMockClient([]);
    expect(await getAppUserByEmail(c as unknown as Client, "no@one.z")).toBeNull();
  });
});
