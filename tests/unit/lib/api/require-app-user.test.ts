import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const jwtVerifyMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("jose", () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: (...a: unknown[]) => jwtVerifyMock(...a),
}));
vi.mock("@/lib/db/users", () => ({ getAppUserByEmail: (...a: unknown[]) => getUserMock(...a) }));
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({}) }));

beforeEach(() => { vi.resetModules(); jwtVerifyMock.mockReset(); getUserMock.mockReset(); });
afterEach(() => vi.restoreAllMocks());

async function load(issuer: string | undefined = "https://kc/realms/s4s") {
  vi.doMock("@/lib/env", () => ({ env: { AUTH_KEYCLOAK_ISSUER: issuer } }));
  return import("@/lib/api/require-app-user");
}
function req(headers: Record<string, string> = {}) {
  return new Request("http://x/api/app/devices", { headers });
}

describe("requireAppUser", () => {
  it("401 sem header Authorization", async () => {
    const { requireAppUser } = await load();
    const r = await requireAppUser(req());
    expect("response" in r && r.response.status).toBe(401);
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });
  it("401 quando issuer não configurado", async () => {
    const { requireAppUser } = await load(undefined);
    const r = await requireAppUser(req({ authorization: "Bearer abc" }));
    expect("response" in r && r.response.status).toBe(401);
  });
  it("401 quando jwtVerify lança (assinatura/exp inválida)", async () => {
    jwtVerifyMock.mockRejectedValue(new Error("bad"));
    const { requireAppUser } = await load();
    const r = await requireAppUser(req({ authorization: "Bearer abc" }));
    expect("response" in r && r.response.status).toBe(401);
  });
  it("401 quando token sem email", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { sub: "s" } });
    const { requireAppUser } = await load();
    const r = await requireAppUser(req({ authorization: "Bearer abc" }));
    expect("response" in r && r.response.status).toBe(401);
  });
  it("401 quando user não existe ou sem tenant", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { email: "a@b.c" } });
    getUserMock.mockResolvedValue(null);
    const { requireAppUser } = await load();
    const r = await requireAppUser(req({ authorization: "Bearer abc" }));
    expect("response" in r && r.response.status).toBe(401);
  });
  it("happy: retorna userId + tenantId", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { email: "a@b.c" } });
    getUserMock.mockResolvedValue({ userId: "u-1", tenantId: "ten-1" });
    const { requireAppUser } = await load();
    const r = await requireAppUser(req({ authorization: "Bearer abc" }));
    expect(r).toEqual({ userId: "u-1", tenantId: "ten-1" });
    expect(jwtVerifyMock.mock.calls[0]?.[2]).toMatchObject({ issuer: "https://kc/realms/s4s" });
  });
});
