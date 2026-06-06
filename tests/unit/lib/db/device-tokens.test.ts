import { describe, it, expect, vi } from "vitest";
import {
  upsertDeviceToken, deleteDeviceToken, deleteTokens, getTokensForTenantOwner,
} from "@/lib/db/device-tokens";

function makeMockClient(rows: unknown[] = []) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}
type Client = Parameters<typeof upsertDeviceToken>[0];

describe("upsertDeviceToken", () => {
  it("INSERT ... ON CONFLICT (token) DO UPDATE com params na ordem", async () => {
    const c = makeMockClient();
    await upsertDeviceToken(c as unknown as Client, { userId: "u-1", token: "ExponentPushToken[x]", platform: "android" });
    const [sql, params] = c.query.mock.calls[0]!;
    expect(sql).toMatch(/INSERT\s+INTO\s+device_tokens/i);
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*token\s*\)\s+DO\s+UPDATE/i);
    expect(sql).toMatch(/last_seen_at\s*=\s*now\(\)/i);
    expect(params).toEqual(["u-1", "ExponentPushToken[x]", "android"]);
  });
});

describe("deleteDeviceToken", () => {
  it("DELETE WHERE token = $1", async () => {
    const c = makeMockClient();
    await deleteDeviceToken(c as unknown as Client, "tok-1");
    const [sql, params] = c.query.mock.calls[0]!;
    expect(sql).toMatch(/DELETE\s+FROM\s+device_tokens\s+WHERE\s+token\s*=\s*\$1/i);
    expect(params).toEqual(["tok-1"]);
  });
});

describe("deleteTokens", () => {
  it("no-op quando lista vazia (não toca o banco)", async () => {
    const c = makeMockClient();
    await deleteTokens(c as unknown as Client, []);
    expect(c.query).not.toHaveBeenCalled();
  });
  it("DELETE ... = ANY($1) com a lista", async () => {
    const c = makeMockClient();
    await deleteTokens(c as unknown as Client, ["a", "b"]);
    const [sql, params] = c.query.mock.calls[0]!;
    expect(sql).toMatch(/DELETE\s+FROM\s+device_tokens\s+WHERE\s+token\s*=\s*ANY\(\$1\)/i);
    expect(params).toEqual([["a", "b"]]);
  });
});

describe("getTokensForTenantOwner", () => {
  it("JOIN users por tenant + role owner, retorna array de tokens", async () => {
    const c = makeMockClient([{ token: "t1" }, { token: "t2" }]);
    const tokens = await getTokensForTenantOwner(c as unknown as Client, "ten-1");
    const [sql, params] = c.query.mock.calls[0]!;
    expect(sql).toMatch(/JOIN\s+users\s+u\s+ON\s+u\.id\s*=\s*dt\.user_id/i);
    expect(sql).toMatch(/u\.tenant_id\s*=\s*\$1/i);
    expect(sql).toMatch(/u\.role\s*=\s*'owner'/i);
    expect(params).toEqual(["ten-1"]);
    expect(tokens).toEqual(["t1", "t2"]);
  });
  it("retorna [] quando não há devices", async () => {
    const c = makeMockClient([]);
    expect(await getTokensForTenantOwner(c as unknown as Client, "ten-x")).toEqual([]);
  });
});
