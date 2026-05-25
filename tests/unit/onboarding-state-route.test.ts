import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const getStateMock = vi.fn();
const saveStateMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/onboarding/server-state", () => ({
  getOnboardingState: (e: string) => getStateMock(e),
  saveOnboardingState: (e: string, p: unknown) => saveStateMock(e, p),
}));

describe("/api/onboarding/state", () => {
  beforeEach(() => {
    authMock.mockReset();
    getStateMock.mockReset();
    saveStateMock.mockReset();
  });

  it("GET 401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/onboarding/state/route");
    const resp = await GET();
    expect(resp.status).toBe(401);
  });

  it("GET 200 devolve o estado da sessão", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev" } });
    getStateMock.mockResolvedValue({ furthestCompletedStep: "kb" });
    const { GET } = await import("@/app/api/onboarding/state/route");
    const resp = await GET();
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ state: { furthestCompletedStep: "kb" } });
    expect(getStateMock).toHaveBeenCalledWith("maria@teste.dev");
  });

  it("PUT 200 faz merge e devolve o estado salvo", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev" } });
    saveStateMock.mockResolvedValue({ furthestCompletedStep: "kb", data: { x: 1 } });
    const { PUT } = await import("@/app/api/onboarding/state/route");
    const req = new Request("http://t/api/onboarding/state", {
      method: "PUT",
      body: JSON.stringify({ furthestCompletedStep: "kb", data: { x: 1 } }),
    });
    const resp = await PUT(req);
    expect(resp.status).toBe(200);
    expect(saveStateMock).toHaveBeenCalledWith("maria@teste.dev", { furthestCompletedStep: "kb", data: { x: 1 } });
  });

  it("PUT 401 sem sessão (não salva)", async () => {
    authMock.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/onboarding/state/route");
    const req = new Request("http://t/api/onboarding/state", { method: "PUT", body: "{}" });
    const resp = await PUT(req);
    expect(resp.status).toBe(401);
    expect(saveStateMock).not.toHaveBeenCalled();
  });
});
