import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const statusMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/onboarding/n8n-client", () => ({ n8nStatus: (id: string) => statusMock(id) }));

function makeReq(url: string) {
  return new Request(url, { method: "GET" });
}

describe("GET /api/onboarding/status", () => {
  beforeEach(() => {
    authMock.mockReset();
    statusMock.mockReset();
  });

  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/onboarding/status/route");
    const resp = await GET(makeReq("http://t/api/onboarding/status?audit_id=a1"));
    expect(resp.status).toBe(401);
  });

  it("400 sem audit_id", async () => {
    authMock.mockResolvedValue({ user: { email: "m@t.dev" } });
    const { GET } = await import("@/app/api/onboarding/status/route");
    const resp = await GET(makeReq("http://t/api/onboarding/status"));
    expect(resp.status).toBe(400);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("200 proxia o status do n8n", async () => {
    authMock.mockResolvedValue({ user: { email: "m@t.dev" } });
    statusMock.mockResolvedValue({
      status: 200,
      body: { audit_id: "a1", status: "awaiting_qr_scan", completed_steps: ["db_insert"], qr_code_url: "data:image/png;base64,AAA" },
    });
    const { GET } = await import("@/app/api/onboarding/status/route");
    const resp = await GET(makeReq("http://t/api/onboarding/status?audit_id=a1"));
    expect(resp.status).toBe(200);
    expect(statusMock).toHaveBeenCalledWith("a1");
    expect((await resp.json()).status).toBe("awaiting_qr_scan");
  });

  it("502 quando o n8n status está indisponível (n8nStatus lança)", async () => {
    authMock.mockResolvedValue({ user: { email: "m@t.dev" } });
    statusMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { GET } = await import("@/app/api/onboarding/status/route");
    const resp = await GET(makeReq("http://t/api/onboarding/status?audit_id=a1"));
    expect(resp.status).toBe(502);
  });
});
