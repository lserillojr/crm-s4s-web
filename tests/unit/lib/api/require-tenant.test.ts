import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
});
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function load() {
  return import("@/lib/api/require-tenant");
}

describe("requireApiTenant", () => {
  it("sem sessão → response 401 (não tenant)", async () => {
    authMock.mockResolvedValue(null);
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    expect("response" in res).toBe(true);
    if ("response" in res) {
      expect(res.response.status).toBe(401);
      expect(res.response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("sessão sem tenantId → response 401", async () => {
    authMock.mockResolvedValue({ user: { name: "João" } });
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    expect("response" in res).toBe(true);
    if ("response" in res) expect(res.response.status).toBe(401);
  });

  it("sessão com tenantId → { tenantId, userName }", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    expect("tenantId" in res).toBe(true);
    if ("tenantId" in res) {
      expect(res.tenantId).toBe("t-1");
      expect(res.userName).toBe("João");
    }
  });

  it("tenantId presente mas name ausente → userName fallback ''", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1" } });
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    if ("tenantId" in res) expect(res.userName).toBe("");
  });
});
