import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/require-tenant", () => ({
  requireApiTenant: vi.fn(async () => ({ tenantId: "t-1" })),
}));
vi.mock("@/lib/api/ai-service", () => ({
  callAiService: vi.fn(),
}));

import { callAiService } from "@/lib/api/ai-service";
import { GET, PUT } from "@/app/api/followup-config/route";
import { followupConfigDefaults } from "@/lib/followup/schema";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/followup-config", () => {
  it("devolve defaults quando o WF degrada", async () => {
    (callAiService as any).mockResolvedValue({ ok: false, reason: "down" });
    const res = await GET({} as any);
    const body = await res.json();
    expect(body.config.enabled).toBe(false);
    expect(body.loaded).toBe(false);
  });

  it("devolve a config do WF quando válida", async () => {
    (callAiService as any).mockResolvedValue({
      ok: true,
      data: { config: { ...followupConfigDefaults, enabled: true } },
    });
    const res = await GET({} as any);
    const body = await res.json();
    expect(body.config.enabled).toBe(true);
    expect(body.loaded).toBe(true);
  });

  it("devolve defaults quando o tenant nao tem linha (config null)", async () => {
    (callAiService as any).mockResolvedValue({ ok: true, data: { config: null } });
    const res = await GET({} as any);
    const body = await res.json();
    expect(body.config.enabled).toBe(false);
    expect(body.loaded).toBe(true);
  });
});

describe("PUT /api/followup-config", () => {
  it("rejeita payload inválido com 400", async () => {
    const req = { json: async () => ({ intensity: "turbo" }) } as any;
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("salva config válida (200)", async () => {
    (callAiService as any).mockResolvedValue({ ok: true, data: {} });
    const req = { json: async () => ({ ...followupConfigDefaults, enabled: true }) } as any;
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(callAiService).toHaveBeenCalled();
  });
});
