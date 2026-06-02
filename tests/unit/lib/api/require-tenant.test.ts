import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
const tenantByEmailMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/auth/onboarding-guard", () => ({
  getTenantIdByEmail: (email: string | null | undefined) =>
    tenantByEmailMock(email),
}));

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
  tenantByEmailMock.mockReset();
  // Default: banco sem tenant pro user (a maioria dos casos legados).
  tenantByEmailMock.mockResolvedValue(null);
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

  it("token defasado (sem tenantId) mas banco tem → resolve do banco (recém-provisionado)", async () => {
    authMock.mockResolvedValue({ user: { email: "mei@teste.dev", name: "MEI" } });
    tenantByEmailMock.mockResolvedValue("t-db-9");
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    expect("tenantId" in res).toBe(true);
    if ("tenantId" in res) {
      expect(res.tenantId).toBe("t-db-9");
      expect(res.userName).toBe("MEI");
    }
    expect(tenantByEmailMock).toHaveBeenCalledWith("mei@teste.dev");
  });

  it("com tenantId na sessão NÃO consulta o banco (caminho rápido)", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", email: "x@y.dev" } });
    const { requireApiTenant } = await load();
    await requireApiTenant();
    expect(tenantByEmailMock).not.toHaveBeenCalled();
  });

  it("sem tenantId na sessão e banco sem → 401", async () => {
    authMock.mockResolvedValue({ user: { email: "novo@teste.dev" } });
    tenantByEmailMock.mockResolvedValue(null);
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    expect("response" in res).toBe(true);
    if ("response" in res) expect(res.response.status).toBe(401);
  });

  it("banco indisponível (lança) → 401 fail-closed", async () => {
    authMock.mockResolvedValue({ user: { email: "x@y.dev" } });
    tenantByEmailMock.mockRejectedValue(new Error("db down"));
    const { requireApiTenant } = await load();
    const res = await requireApiTenant();
    expect("response" in res).toBe(true);
    if ("response" in res) expect(res.response.status).toBe(401);
  });
});
