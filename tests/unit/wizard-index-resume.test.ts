import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const getStateMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/onboarding/server-state", () => ({ getOnboardingState: (e: string) => getStateMock(e) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirectMock(u) }));

describe("WizardIndex resume", () => {
  beforeEach(() => {
    authMock.mockReset();
    getStateMock.mockReset();
    redirectMock.mockClear();
  });

  it("redireciona pra provisioning quando há auditId no server-state", async () => {
    authMock.mockResolvedValue({ user: { email: "m@t.dev" } });
    getStateMock.mockResolvedValue({ auditId: "a1", lastStatus: "awaiting_qr_scan" });
    const { default: WizardIndex } = await import("@/app/(onboarding)/wizard/page");
    await expect(WizardIndex()).rejects.toThrow("REDIRECT:/wizard/provisioning?audit_id=a1");
  });

  it("redireciona pro primeiro step quando sem auditId", async () => {
    authMock.mockResolvedValue({ user: { email: "m@t.dev" } });
    getStateMock.mockResolvedValue(null);
    const { default: WizardIndex } = await import("@/app/(onboarding)/wizard/page");
    await expect(WizardIndex()).rejects.toThrow("REDIRECT:/wizard/whatsapp");
  });

  it("sem sessão vai pro primeiro step (middleware cuida do gate de auth)", async () => {
    authMock.mockResolvedValue(null);
    const { default: WizardIndex } = await import("@/app/(onboarding)/wizard/page");
    await expect(WizardIndex()).rejects.toThrow("REDIRECT:/wizard/whatsapp");
    expect(getStateMock).not.toHaveBeenCalled();
  });
});
