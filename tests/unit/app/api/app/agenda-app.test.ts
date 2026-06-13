import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: vi.fn() }));
vi.mock("@/lib/ai-service", () => ({ callAgendaService: vi.fn() }));

import { requireAppUser } from "@/lib/api/require-app-user";
import { callAgendaService } from "@/lib/ai-service";
import { GET as listGET } from "@/app/api/app/agenda/list/route";
import { POST as criarPOST } from "@/app/api/app/agenda/appointments/route";
import { POST as reschedulePOST } from "@/app/api/app/agenda/appointments/[id]/reschedule/route";
import { POST as cancelPOST } from "@/app/api/app/agenda/appointments/[id]/cancel/route";
import { GET as contatosGET } from "@/app/api/app/agenda/contacts/search/route";

const reqUser = vi.mocked(requireAppUser);
const callSvc = vi.mocked(callAgendaService);

function upstream(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  reqUser.mockReset();
  callSvc.mockReset();
  reqUser.mockResolvedValue({ userId: "u1", tenantId: "t1" } as never);
});

describe("GET /api/app/agenda/list", () => {
  it("401 quando requireAppUser nega", async () => {
    reqUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) } as never);
    const res = await listGET(new Request("http://x/api/app/agenda/list?dia=2026-06-18"));
    expect(res.status).toBe(401);
    expect(callSvc).not.toHaveBeenCalled();
  });

  it("chama o FastAPI com tenant da sessão e janela BR do dia (00:00→00:00 do dia seguinte, -03:00)", async () => {
    callSvc.mockResolvedValue(upstream({ appointments: [], blocks: [] }));
    await listGET(new Request("http://x/api/app/agenda/list?dia=2026-06-18"));
    expect(callSvc).toHaveBeenCalledWith(
      "/agenda/list?tenant=t1&from=2026-06-18T00%3A00%3A00-03%3A00&to=2026-06-19T00%3A00%3A00-03%3A00",
    );
  });

  it("mapeia para DTO limpo, deriva online de meetLink, descarta cancelados e ordena por horário", async () => {
    callSvc.mockResolvedValue(
      upstream({
        appointments: [
          { id: "b", start: "2026-06-18T15:00:00-03:00", end: "2026-06-18T16:00:00-03:00",
            contactName: "Bia", title: "Corte", meetLink: null, status: "confirmado", source: "manual", odooPartnerId: 9 },
          { id: "a", start: "2026-06-18T09:00:00-03:00", end: "2026-06-18T10:00:00-03:00",
            contactName: "Ana", title: null, meetLink: "https://meet.google.com/xyz", status: "confirmado", source: "odoo", odooPartnerId: 1 },
          { id: "c", start: "2026-06-18T11:00:00-03:00", end: "2026-06-18T11:30:00-03:00",
            contactName: "Cao", title: "X", meetLink: null, status: "cancelado", source: "manual", odooPartnerId: 2 },
        ],
        blocks: [{ id: "blk1", start: "x", end: "y", reason: "almoço" }],
      }),
    );
    const res = await listGET(new Request("http://x/api/app/agenda/list?dia=2026-06-18"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "a", inicio: "2026-06-18T09:00:00-03:00", fim: "2026-06-18T10:00:00-03:00", cliente: "Ana", titulo: null, online: true },
      { id: "b", inicio: "2026-06-18T15:00:00-03:00", fim: "2026-06-18T16:00:00-03:00", cliente: "Bia", titulo: "Corte", online: false },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/odoo|source|blocks|meetLink/i);
  });

  it("contactName nulo vira 'Sem cliente'", async () => {
    callSvc.mockResolvedValue(
      upstream({ appointments: [
        { id: "a", start: "2026-06-18T09:00:00-03:00", end: "2026-06-18T10:00:00-03:00",
          contactName: null, title: null, meetLink: null, status: "confirmado", source: "manual" },
      ], blocks: [] }),
    );
    const body = await (await listGET(new Request("http://x/api/app/agenda/list?dia=2026-06-18"))).json();
    expect(body[0].cliente).toBe("Sem cliente");
  });

  it("502 sanitizado quando o upstream falha (sem vazar detail)", async () => {
    callSvc.mockResolvedValue(upstream({ error: "boom" }, 500));
    const res = await listGET(new Request("http://x/api/app/agenda/list?dia=2026-06-18"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream");
    expect(body.detail).toBeUndefined();
  });
});

describe("POST /api/app/agenda/appointments", () => {
  it("422 quando o corpo é inválido (sem inicioISO/duracaoMin)", async () => {
    const res = await criarPOST(new Request("http://x/api/app/agenda/appointments", { method: "POST", body: JSON.stringify({ titulo: "x" }) }));
    expect(res.status).toBe(422);
    expect(callSvc).not.toHaveBeenCalled();
  });

  it("traduz o corpo limpo para o corpo canônico do FastAPI (contatoId→odoo_partner_id, online→Meet)", async () => {
    callSvc.mockResolvedValue(upstream({ id: "novo", start: "2026-06-18T14:00:00-03:00", end: "2026-06-18T15:00:00-03:00", contactName: "Ana", title: "Corte", meetLink: "m", status: "confirmado", source: "manual" }, 200));
    const res = await criarPOST(new Request("http://x/api/app/agenda/appointments", {
      method: "POST",
      body: JSON.stringify({ inicioISO: "2026-06-18T14:00:00-03:00", duracaoMin: 60, titulo: "Corte", contatoId: 7, online: true }),
    }));
    expect(res.status).toBe(200);
    const [path, init] = callSvc.mock.calls[0]!;
    expect(path).toBe("/agenda/appointments?tenant=t1");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      start: "2026-06-18T14:00:00-03:00", duration_min: 60, contact_name: null, contact_phone: null,
      title: "Corte", online: true, contact_email: null, odoo_partner_id: 7, invite: false,
    });
    const body = await res.json();
    expect(body.id).toBe("novo");
  });

  it("409 do upstream vira 409 slot_ocupado", async () => {
    callSvc.mockResolvedValue(upstream({ error: "slot_ocupado" }, 409));
    const res = await criarPOST(new Request("http://x/api/app/agenda/appointments", {
      method: "POST", body: JSON.stringify({ inicioISO: "2026-06-18T14:00:00-03:00", duracaoMin: 60, cliente: "Ana" }),
    }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("slot_ocupado");
  });
});

describe("POST /api/app/agenda/appointments/[id]/reschedule", () => {
  it("422 sem novoInicioISO", async () => {
    const res = await reschedulePOST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }), { params: { id: "ap1" } });
    expect(res.status).toBe(422);
  });
  it("repassa newSlotIso e o id ao FastAPI", async () => {
    callSvc.mockResolvedValue(upstream({ status: "remarcado" }));
    const res = await reschedulePOST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ novoInicioISO: "2026-06-20T10:00:00-03:00" }) }),
      { params: { id: "ap1" } },
    );
    expect(res.status).toBe(200);
    const [path, init] = callSvc.mock.calls[0]!;
    expect(path).toBe("/agenda/appointments/ap1/reschedule?tenant=t1");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ new_slot_iso: "2026-06-20T10:00:00-03:00" });
  });
});

describe("POST /api/app/agenda/appointments/[id]/cancel", () => {
  it("chama cancel no FastAPI com tenant e id", async () => {
    callSvc.mockResolvedValue(upstream({ status: "cancelado" }));
    const res = await cancelPOST(new Request("http://x", { method: "POST" }), { params: { id: "ap2" } });
    expect(res.status).toBe(200);
    expect(callSvc).toHaveBeenCalledWith("/agenda/appointments/ap2/cancel?tenant=t1", { method: "POST" });
  });
  it("502 sanitizado se o upstream falhar", async () => {
    callSvc.mockResolvedValue(upstream({ error: "x" }, 500));
    const res = await cancelPOST(new Request("http://x", { method: "POST" }), { params: { id: "ap2" } });
    expect(res.status).toBe(502);
    expect((await res.json()).detail).toBeUndefined();
  });
});

describe("GET /api/app/agenda/contacts/search", () => {
  it("term < 2 chars devolve [] sem chamar o upstream", async () => {
    const res = await contatosGET(new Request("http://x/api/app/agenda/contacts/search?term=a"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(callSvc).not.toHaveBeenCalled();
  });

  it("mapeia results do FastAPI para DTO limpo (name→nome, phone→telefone)", async () => {
    callSvc.mockResolvedValue(upstream({ results: [
      { id: 10, name: "Ana Souza", phone: "+5511999", email: "a@x.com" },
      { id: 11, name: "Bia", phone: null },
    ] }));
    const res = await contatosGET(new Request("http://x/api/app/agenda/contacts/search?term=an"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: 10, nome: "Ana Souza", telefone: "+5511999" },
      { id: 11, nome: "Bia", telefone: null },
    ]);
    expect(callSvc).toHaveBeenCalledWith("/agenda/contacts/search?tenant=t1&term=an");
    expect(JSON.stringify(body)).not.toMatch(/email|odoo/i);
  });

  it("502 sanitizado se o upstream falhar", async () => {
    callSvc.mockResolvedValue(upstream({ error: "x" }, 500));
    const res = await contatosGET(new Request("http://x/api/app/agenda/contacts/search?term=an"));
    expect(res.status).toBe(502);
    expect((await res.json()).detail).toBeUndefined();
  });
});
