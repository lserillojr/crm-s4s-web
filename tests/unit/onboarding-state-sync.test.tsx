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
        expect.objectContaining({ furthestCompletedStep: "whatsapp" }),
      ),
    );
  });

  it("não renderiza nada (componente invisível)", () => {
    const { container } = render(<OnboardingStateSync />);
    expect(container.firstChild).toBeNull();
  });
});
