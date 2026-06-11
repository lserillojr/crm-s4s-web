import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/require-tenant", () => ({
  requireApiTenant: vi.fn(async () => ({ tenantId: "tn-1" })),
}));
const callAgendaService = vi.fn();
vi.mock("@/lib/ai-service", () => ({ callAgendaService: (...a: unknown[]) => callAgendaService(...a) }));

import { POST } from "@/app/api/agenda/appointments/route";

function req(body: unknown) {
  return new Request("http://t/api/agenda/appointments", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agenda/appointments", () => {
  beforeEach(() => callAgendaService.mockReset());

  it("repassa ao FastAPI com tenant da sessão e snake_case", async () => {
    callAgendaService.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "a1" }) });
    const res = await POST(req({ startIso: "2026-09-10T13:00:00-03:00", durationMin: 30, contactName: "Ana", title: "corte" }));
    expect(res.status).toBe(200);
    const url = callAgendaService.mock.calls[0]![0] as string;
    expect(url).toContain("/agenda/appointments?tenant=tn-1");
    const init = callAgendaService.mock.calls[0]![1] as { body: string };
    expect(JSON.parse(init.body)).toMatchObject({ start: "2026-09-10T13:00:00-03:00", duration_min: 30, contact_name: "Ana", title: "corte" });
  });

  it("body inválido → 422", async () => {
    const res = await POST(req({ durationMin: 30 }));
    expect(res.status).toBe(422);
  });

  it("conflito upstream (409) → 409", async () => {
    callAgendaService.mockResolvedValue({ ok: false, status: 409, json: async () => ({}) });
    const res = await POST(req({ startIso: "2026-09-10T13:00:00-03:00", durationMin: 30 }));
    expect(res.status).toBe(409);
  });

  it("repassa online ao FastAPI (snake_case)", async () => {
    callAgendaService.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "a1", meetLink: null }) });
    const res = await POST(req({ startIso: "2026-09-10T13:00:00-03:00", durationMin: 30, online: true }));
    expect(res.status).toBe(200);
    const init = callAgendaService.mock.calls[0]![1] as { body: string };
    expect(JSON.parse(init.body)).toMatchObject({ online: true });
  });
});
