// tests/unit/onboarding-state-sync.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";

const loadServerStateMock = vi.fn();
const saveServerStateMock = vi.fn();
vi.mock("@/lib/onboarding/client", () => ({
  loadServerState: () => loadServerStateMock(),
  saveServerState: (p: unknown) => saveServerStateMock(p),
}));

import { OnboardingStateSync } from "@/components/onboarding/onboarding-state-sync";
import { useWizardStore } from "@/lib/wizard/store";
import { wizardDefaults } from "@/lib/wizard/schemas";

describe("OnboardingStateSync", () => {
  beforeEach(() => {
    // shouldAdvanceTime: true — permite waitFor continuar polling via tempo real
    // enquanto vi.advanceTimersByTime ainda controla o debounce.
    // Isso evita deadlock entre fake timers e waitFor interno do testing-library.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    loadServerStateMock.mockReset().mockResolvedValue(null);
    saveServerStateMock.mockReset().mockResolvedValue(undefined);
    useWizardStore.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  it("no mount hidrata o store do server quando há estado", async () => {
    loadServerStateMock.mockResolvedValue({ furthestCompletedStep: "kb" });
    render(<OnboardingStateSync />);
    await waitFor(() => expect(loadServerStateMock).toHaveBeenCalled());
    expect(useWizardStore.getState().furthestCompletedStep).toBe("kb");
  });

  it("write-through (debounced) quando o store muda", async () => {
    render(<OnboardingStateSync />);
    await waitFor(() => expect(loadServerStateMock).toHaveBeenCalled());
    act(() => {
      useWizardStore.getState().markCompleted("whatsapp");
    });
    act(() => vi.advanceTimersByTime(900));
    await waitFor(() =>
      expect(saveServerStateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          furthestCompletedStep: "whatsapp",
          data: expect.any(Object),
        }),
      ),
    );
  });

  it("hidrata os dados do wizard vindos do server (sobrevive a limpar localStorage)", async () => {
    loadServerStateMock.mockResolvedValue({
      furthestCompletedStep: "kb",
      data: {
        ...wizardDefaults,
        kb: { businessName: "Salão Z", vertical: "beleza", about: "z".repeat(40) },
      },
    });
    render(<OnboardingStateSync />);
    await waitFor(() => expect(loadServerStateMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(useWizardStore.getState().data.kb.businessName).toBe("Salão Z"),
    );
  });

  it("não renderiza nada (componente invisível)", () => {
    const { container } = render(<OnboardingStateSync />);
    expect(container.firstChild).toBeNull();
  });

  it("reseta dados de outro dono antes de hidratar (sessionEmail diferente)", async () => {
    // localStorage carrega dados da conta A (dono "a@x.com")
    useWizardStore.getState().ensureOwner("a@x.com");
    useWizardStore.getState().setKb({
      businessName: "Salão da A",
      vertical: "beleza",
      about: "a".repeat(40),
    });
    // Conta B (nova) não tem estado no server
    loadServerStateMock.mockResolvedValue(null);

    render(<OnboardingStateSync sessionEmail="b@y.com" />);
    await waitFor(() => expect(loadServerStateMock).toHaveBeenCalled());

    // O nome da conta A NÃO pode sobreviver para a conta B
    expect(useWizardStore.getState().data.kb.businessName).toBe("");
    expect(useWizardStore.getState().ownerEmail).toBe("b@y.com");
  });
});
