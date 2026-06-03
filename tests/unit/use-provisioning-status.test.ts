// tests/unit/use-provisioning-status.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const fetchStatusMock = vi.fn();
vi.mock("@/lib/onboarding/client", () => ({ fetchStatus: (id: string) => fetchStatusMock(id) }));

import { useProvisioningStatus } from "@/lib/onboarding/use-provisioning-status";

describe("useProvisioningStatus", () => {
  beforeEach(() => {
    // shouldAdvanceTime: true — evita deadlock entre fake timers e o waitFor
    // interno do testing-library (mesma adaptação de onboarding-state-sync.test.tsx).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchStatusMock.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("busca o status no mount e expõe o resultado", async () => {
    fetchStatusMock.mockResolvedValue({ audit_id: "a1", status: "in_progress", completed_steps: [] });
    const { result } = renderHook(() => useProvisioningStatus("a1", { intervalMs: 1000 }));
    await waitFor(() => expect(result.current.status?.status).toBe("in_progress"));
    expect(fetchStatusMock).toHaveBeenCalledWith("a1");
  });

  it("para o polling ao atingir estado terminal (success)", async () => {
    fetchStatusMock
      .mockResolvedValueOnce({ audit_id: "a1", status: "in_progress", completed_steps: [] })
      .mockResolvedValueOnce({ audit_id: "a1", status: "success", completed_steps: [], magic_link: "m" });
    const { result } = renderHook(() => useProvisioningStatus("a1", { intervalMs: 1000 }));
    await waitFor(() => expect(result.current.status?.status).toBe("in_progress"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => expect(result.current.status?.status).toBe("success"));
    const callsAfterSuccess = fetchStatusMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fetchStatusMock.mock.calls.length).toBe(callsAfterSuccess); // não busca mais
  });

  it("refresh() força uma busca imediata", async () => {
    fetchStatusMock.mockResolvedValue({ audit_id: "a1", status: "awaiting_qr_scan", completed_steps: [], qr_code_url: "q" });
    const { result } = renderHook(() => useProvisioningStatus("a1", { intervalMs: 100000 }));
    await waitFor(() => expect(fetchStatusMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchStatusMock).toHaveBeenCalledTimes(2);
  });

  it("auditId nulo não busca", () => {
    renderHook(() => useProvisioningStatus(null, { intervalMs: 1000 }));
    expect(fetchStatusMock).not.toHaveBeenCalled();
  });

  it("após o timeout em in_progress, expõe timedOut e para o polling", async () => {
    fetchStatusMock.mockResolvedValue({ audit_id: "a1", status: "in_progress", completed_steps: [] });
    const { result } = renderHook(() =>
      useProvisioningStatus("a1", { intervalMs: 1000, timeoutMs: 3000 }),
    );
    await waitFor(() => expect(result.current.status?.status).toBe("in_progress"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await waitFor(() => expect(result.current.timedOut).toBe(true));
    const calls = fetchStatusMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchStatusMock.mock.calls.length).toBe(calls); // parou de pollar
  });

  it("awaiting_qr_scan NÃO dá timeout (espera o usuário escanear)", async () => {
    fetchStatusMock.mockResolvedValue({ audit_id: "a1", status: "awaiting_qr_scan", completed_steps: [], qr_code_url: "q" });
    const { result } = renderHook(() =>
      useProvisioningStatus("a1", { intervalMs: 1000, timeoutMs: 3000 }),
    );
    await waitFor(() => expect(result.current.status?.status).toBe("awaiting_qr_scan"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(result.current.timedOut).toBe(false);
  });
});
