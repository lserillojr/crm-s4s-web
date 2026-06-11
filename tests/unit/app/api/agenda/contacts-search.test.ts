import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/require-tenant", () => ({ requireApiTenant: vi.fn(async () => ({ tenantId: "tn-1" })) }));
const callAgendaService = vi.fn();
vi.mock("@/lib/ai-service", () => ({ callAgendaService: (...a: unknown[]) => callAgendaService(...a) }));

import { GET } from "@/app/api/agenda/contacts/search/route";

describe("GET /api/agenda/contacts/search", () => {
  beforeEach(() => callAgendaService.mockReset());
  it("repassa term + tenant da sessão e devolve results", async () => {
    callAgendaService.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [{ id: 7, name: "Ana" }] }) });
    const res = await GET(new Request("http://t/api/agenda/contacts/search?term=ana"));
    expect(res.status).toBe(200);
    const url = callAgendaService.mock.calls[0]![0] as string;
    expect(url).toContain("/agenda/contacts/search?tenant=tn-1");
    expect(url).toContain("term=ana");
    expect((await res.json()).results[0].name).toBe("Ana");
  });
  it("term curto (<2) → results vazio sem chamar upstream", async () => {
    const res = await GET(new Request("http://t/api/agenda/contacts/search?term=a"));
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
    expect(callAgendaService).not.toHaveBeenCalled();
  });
});
