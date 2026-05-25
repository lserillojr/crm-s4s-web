import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const provisionMock = vi.fn();
const getStateMock = vi.fn();
const saveStateMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/onboarding/n8n-client", () => ({ n8nProvision: (p: unknown) => provisionMock(p) }));
vi.mock("@/lib/onboarding/server-state", () => ({
  getOnboardingState: (e: string) => getStateMock(e),
  saveOnboardingState: (e: string, p: unknown) => saveStateMock(e, p),
}));

import { wizardDefaults } from "@/lib/wizard/schemas";

function makeReq(body: unknown) {
  return new Request("http://t/api/onboarding/provision", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validWizard = {
  ...wizardDefaults,
  whatsapp: { phoneNumber: "11988887777", provider: "evolution", hasExistingNumber: true },
  kb: { businessName: "Salão Maria", vertical: "beleza", about: "x".repeat(40) },
  confirm: { acceptTerms: true },
};

describe("POST /api/onboarding/provision", () => {
  beforeEach(() => {
    authMock.mockReset();
    provisionMock.mockReset();
    getStateMock.mockReset();
    saveStateMock.mockReset();
    getStateMock.mockResolvedValue(null);
    saveStateMock.mockResolvedValue({});
  });

  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({ wizard: validWizard }));
    expect(resp.status).toBe(401);
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("202 repassa audit_id e persiste idempotencyKey + auditId", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev", name: "Maria" } });
    provisionMock.mockResolvedValue({ status: 202, body: { audit_id: "a1", status: "in_progress", poll_url: "/p" } });
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({ wizard: validWizard }));
    expect(resp.status).toBe(202);
    expect(await resp.json()).toMatchObject({ audit_id: "a1", status: "in_progress" });
    const payload = provisionMock.mock.calls[0]![0];
    expect(payload.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.tenant.slug).toBe("salao-maria");
    expect(saveStateMock).toHaveBeenCalledWith(
      "maria@teste.dev",
      expect.objectContaining({ auditId: "a1", idempotencyKey: payload.idempotency_key }),
    );
  });

  it("reusa idempotencyKey existente no onboarding_state", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev", name: "Maria" } });
    getStateMock.mockResolvedValue({ idempotencyKey: "22222222-2222-4222-8222-222222222222" });
    provisionMock.mockResolvedValue({ status: 200, body: { audit_id: "a1", status: "success", idempotency_replay: true } });
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({ wizard: validWizard }));
    expect(resp.status).toBe(200);
    expect(provisionMock.mock.calls[0]![0].idempotency_key).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("400 quando wizard ausente", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev", name: "Maria" } });
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({}));
    expect(resp.status).toBe(400);
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("propaga status de erro do n8n (ex: 422 slug em uso)", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev", name: "Maria" } });
    provisionMock.mockResolvedValue({ status: 422, body: { error: "business_rule_violation" } });
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({ wizard: validWizard }));
    expect(resp.status).toBe(422);
    expect(saveStateMock).not.toHaveBeenCalled();
  });

  it("502 quando o n8n está indisponível (n8nProvision lança)", async () => {
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev", name: "Maria" } });
    provisionMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({ wizard: validWizard }));
    expect(resp.status).toBe(502);
    expect(saveStateMock).not.toHaveBeenCalled();
  });

  it("ainda devolve 202 + audit_id se o persist falhar após o n8n aceitar", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue({ user: { email: "maria@teste.dev", name: "Maria" } });
    provisionMock.mockResolvedValue({ status: 202, body: { audit_id: "a1", status: "in_progress" } });
    saveStateMock.mockRejectedValue(new Error("DB down"));
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const resp = await POST(makeReq({ wizard: validWizard }));
    expect(resp.status).toBe(202);
    expect(await resp.json()).toMatchObject({ audit_id: "a1" });
    errSpy.mockRestore();
  });
});
