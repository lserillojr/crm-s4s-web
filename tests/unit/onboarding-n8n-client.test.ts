import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("n8n-client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function loadWithEnv() {
    vi.doMock("@/lib/env", () => ({
      env: {
        N8N_API_BASE_URL: "https://n8n.example/webhook",
        N8N_PROVISION_API_KEY: "secret-key",
      },
    }));
    return import("@/lib/onboarding/n8n-client");
  }

  it("n8nProvision faz POST com X-API-KEY e devolve {status, body}", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 202,
      json: async () => ({ audit_id: "a1", status: "in_progress" }),
    });
    const { n8nProvision } = await loadWithEnv();
    const res = await n8nProvision({ idempotency_key: "k" } as never);
    expect(fetch).toHaveBeenCalledWith(
      "https://n8n.example/webhook/onboarding/provision",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-KEY": "secret-key", "Content-Type": "application/json" }),
      }),
    );
    expect(res).toEqual({ status: 202, body: { audit_id: "a1", status: "in_progress" } });
  });

  it("n8nStatus faz GET com audit_id na query", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => ({ audit_id: "a1", status: "awaiting_qr_scan", completed_steps: [] }),
    });
    const { n8nStatus } = await loadWithEnv();
    const res = await n8nStatus("a1");
    expect(fetch).toHaveBeenCalledWith(
      "https://n8n.example/webhook/onboarding/status?audit_id=a1",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ "X-API-KEY": "secret-key" }) }),
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("awaiting_qr_scan");
  });

  it("lança se env n8n não configurado", async () => {
    vi.doMock("@/lib/env", () => ({ env: { N8N_API_BASE_URL: undefined, N8N_PROVISION_API_KEY: undefined } }));
    const { n8nProvision } = await import("@/lib/onboarding/n8n-client");
    await expect(n8nProvision({} as never)).rejects.toThrow(/N8N_API_BASE_URL/);
  });
});
