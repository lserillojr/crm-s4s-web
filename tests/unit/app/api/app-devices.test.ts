import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const requireMock = vi.fn();
const upsertMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (...a: unknown[]) => requireMock(...a) }));
vi.mock("@/lib/db/device-tokens", () => ({
  upsertDeviceToken: (...a: unknown[]) => upsertMock(...a),
  deleteDeviceToken: (...a: unknown[]) => deleteMock(...a),
}));
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({}) }));

beforeEach(() => { vi.resetModules(); requireMock.mockReset(); upsertMock.mockReset(); deleteMock.mockReset(); });
afterEach(() => vi.restoreAllMocks());

function jsonReq(method: string, body: unknown) {
  return new Request("http://x/api/app/devices", {
    method, headers: { "Content-Type": "application/json", authorization: "Bearer abc" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/app/devices", () => {
  it("401 propaga o guard (não toca o banco)", async () => {
    requireMock.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    const { POST } = await import("@/app/api/app/devices/route");
    const res = await POST(jsonReq("POST", { token: "t", platform: "android" }));
    expect(res.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });
  it("400 body inválido (platform fora do enum)", async () => {
    requireMock.mockResolvedValue({ userId: "u-1", tenantId: "ten-1" });
    const { POST } = await import("@/app/api/app/devices/route");
    const res = await POST(jsonReq("POST", { token: "t", platform: "windows" }));
    expect(res.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });
  it("200 upsert com userId do guard + token/platform do body", async () => {
    requireMock.mockResolvedValue({ userId: "u-1", tenantId: "ten-1" });
    const { POST } = await import("@/app/api/app/devices/route");
    const res = await POST(jsonReq("POST", { token: "ExponentPushToken[x]", platform: "ios" }));
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith({}, { userId: "u-1", token: "ExponentPushToken[x]", platform: "ios" });
  });
});

describe("DELETE /api/app/devices", () => {
  it("200 remove o token do body", async () => {
    requireMock.mockResolvedValue({ userId: "u-1", tenantId: "ten-1" });
    const { DELETE } = await import("@/app/api/app/devices/route");
    const res = await DELETE(jsonReq("DELETE", { token: "tok-1" }));
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({}, "tok-1", "u-1");
  });
});
