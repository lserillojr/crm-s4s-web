import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitProvision, fetchStatus, loadServerState, saveServerState } from "@/lib/onboarding/client";
import { wizardDefaults } from "@/lib/wizard/schemas";

function mockFetchOnce(status: number, json: unknown) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  });
}

describe("onboarding client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("submitProvision faz POST /api/onboarding/provision e devolve o result", async () => {
    mockFetchOnce(202, { audit_id: "a1", status: "in_progress" });
    const res = await submitProvision(wizardDefaults);
    expect(fetch).toHaveBeenCalledWith(
      "/api/onboarding/provision",
      expect.objectContaining({ method: "POST" }),
    );
    expect(res).toEqual({ ok: true, status: 202, result: { audit_id: "a1", status: "in_progress" } });
  });

  it("submitProvision devolve ok:false com o status em erro", async () => {
    mockFetchOnce(422, { error: "business_rule_violation" });
    const res = await submitProvision(wizardDefaults);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  it("fetchStatus faz GET com audit_id", async () => {
    mockFetchOnce(200, { audit_id: "a1", status: "success", completed_steps: [] });
    const res = await fetchStatus("a1");
    expect(fetch).toHaveBeenCalledWith("/api/onboarding/status?audit_id=a1", expect.objectContaining({ method: "GET" }));
    expect(res.status).toBe("success");
  });

  it("loadServerState devolve o state (ou null)", async () => {
    mockFetchOnce(200, { state: { furthestCompletedStep: "kb" } });
    expect(await loadServerState()).toEqual({ furthestCompletedStep: "kb" });
    mockFetchOnce(401, {});
    expect(await loadServerState()).toBeNull();
  });

  it("saveServerState faz PUT com o patch", async () => {
    mockFetchOnce(200, { state: {} });
    await saveServerState({ furthestCompletedStep: "kb" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/onboarding/state",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
