import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Testes dos route handlers de escrita em appointments (Onda 2):
 *   POST /api/agenda/appointments/[id]/cancel
 *   POST /api/agenda/appointments/[id]/reschedule
 *
 * Verifica:
 * - 401 sem sessão (cancel e reschedule)
 * - cancel: chama FastAPI com tenant e id corretos
 * - cancel: FastAPI não-ok → 502
 * - reschedule: body inválido → 422
 * - reschedule: chama FastAPI com new_slot_iso correto
 * - reschedule: FastAPI não-ok → 502
 * - tenant NÃO pode ser sobrescrito pelo cliente
 */

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
  (global.fetch as any) = vi.fn();
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

function setEnv(base?: string, secret?: string) {
  if (base !== undefined) {
    process.env.AI_SERVICE_BASE_URL = base;
  } else {
    delete process.env.AI_SERVICE_BASE_URL;
  }
  if (secret !== undefined) {
    process.env.AI_SERVICE_SECRET = secret;
  } else {
    delete process.env.AI_SERVICE_SECRET;
  }
}

async function loadCancelRoute() {
  setEnv("https://ai.example.com", "test-secret");
  return import("@/app/api/agenda/appointments/[id]/cancel/route");
}

async function loadRescheduleRoute() {
  setEnv("https://ai.example.com", "test-secret");
  return import("@/app/api/agenda/appointments/[id]/reschedule/route");
}

// Next.js 14: params is a plain object { id: string }
const params = { params: { id: "appt-99" } };

// -----------------------------------------------------------------------
// cancel
// -----------------------------------------------------------------------
describe("POST /api/agenda/appointments/[id]/cancel", () => {
  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await loadCancelRoute();
    const res = await POST(new Request("http://app/cancel", { method: "POST" }), params);
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("chama FastAPI com id e tenant da sessão corretos", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "tenant-cancel", name: "Ana" } });
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ status: "cancelado" }), { status: 200 }),
    );

    const { POST } = await loadCancelRoute();
    const res = await POST(
      new Request("http://app/cancel", { method: "POST" }),
      params,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelado");

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/agenda/appointments/appt-99/cancel");
    expect(url).toContain("tenant=tenant-cancel");
    expect(opts.method).toBe("POST");
    expect(opts.headers["x-agenda-secret"]).toBe("test-secret");
  });

  it("FastAPI não-ok → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    const { POST } = await loadCancelRoute();
    const res = await POST(
      new Request("http://app/cancel", { method: "POST" }),
      params,
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream" });
  });

  it("tenant NÃO pode vir do cliente (apenas da sessão)", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "real-tenant", name: "João" } });
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ status: "cancelado" }), { status: 200 }),
    );

    const { POST } = await loadCancelRoute();
    await POST(new Request("http://app/cancel?tenant=evil", { method: "POST" }), params);

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("tenant=real-tenant");
    expect(url).not.toContain("evil");
  });
});

// -----------------------------------------------------------------------
// reschedule
// -----------------------------------------------------------------------
describe("POST /api/agenda/appointments/[id]/reschedule", () => {
  const newSlotIso = "2026-06-20T14:00:00Z";

  function makeRescheduleReq(body: unknown) {
    return new Request("http://app/reschedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await loadRescheduleRoute();
    const res = await POST(
      makeRescheduleReq({ newSlotIso }),
      params,
    );
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("422 com body inválido (newSlotIso não-datetime)", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    const { POST } = await loadRescheduleRoute();
    const res = await POST(
      makeRescheduleReq({ newSlotIso: "2026-06-20" }),
      params,
    );
    expect(res.status).toBe(422);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("chama FastAPI com id, tenant e new_slot_iso corretos", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "tenant-resch", name: "Ana" } });
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ status: "remarcado" }), { status: 200 }),
    );

    const { POST } = await loadRescheduleRoute();
    const res = await POST(makeRescheduleReq({ newSlotIso }), params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("remarcado");

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/agenda/appointments/appt-99/reschedule");
    expect(url).toContain("tenant=tenant-resch");
    expect(opts.method).toBe("POST");
    expect(opts.headers["x-agenda-secret"]).toBe("test-secret");

    const sentBody = JSON.parse(opts.body);
    // O camelCase newSlotIso deve ser convertido para snake_case new_slot_iso
    expect(sentBody.new_slot_iso).toBe(newSlotIso);
    expect(sentBody.newSlotIso).toBeUndefined();
  });

  it("FastAPI não-ok → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(
      new Response("conflict", { status: 409 }),
    );

    const { POST } = await loadRescheduleRoute();
    const res = await POST(makeRescheduleReq({ newSlotIso }), params);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream" });
  });

  it("env ausente → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    setEnv(undefined, undefined);

    const { POST } = await loadRescheduleRoute();
    const res = await POST(makeRescheduleReq({ newSlotIso }), params);
    expect(res.status).toBe(502);
  });
});
