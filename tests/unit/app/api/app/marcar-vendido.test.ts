import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAppUser = vi.fn();
const marcarVendido = vi.fn();
vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (r: Request) => requireAppUser(r) }));
vi.mock("@/lib/api/conversations-service", () => ({
  marcarVendido: (...a: unknown[]) => marcarVendido(...a),
}));

import { POST } from "@/app/api/app/conversations/[id]/marcar-vendido/route";

const params = { params: { id: "5" } };
function bodyReq(obj?: unknown) {
  return new Request("http://x", {
    method: "POST",
    body: obj === undefined ? "" : JSON.stringify(obj),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /marcar-vendido", () => {
  beforeEach(() => { requireAppUser.mockReset(); marcarVendido.mockReset(); });

  it("401 quando não autenticado", async () => {
    requireAppUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) });
    const res = await POST(bodyReq({}), params);
    expect(res.status).toBe(401);
    expect(marcarVendido).not.toHaveBeenCalled();
  });

  it("move venda_fechada com valor e isola por tenant", async () => {
    requireAppUser.mockResolvedValue({ tenantId: "t1" });
    marcarVendido.mockResolvedValue({ moved: true });
    const res = await POST(bodyReq({ valorBrl: 1990 }), params);
    expect(res.status).toBe(200);
    expect(marcarVendido).toHaveBeenCalledWith("t1", 5, 1990);
    expect(await res.json()).toMatchObject({ ok: true, status: "vendido" });
  });

  it("aceita sem valor (R$ opcional) — passa null", async () => {
    requireAppUser.mockResolvedValue({ tenantId: "t1" });
    marcarVendido.mockResolvedValue({ moved: true });
    const res = await POST(bodyReq({}), params);
    expect(res.status).toBe(200);
    expect(marcarVendido).toHaveBeenCalledWith("t1", 5, null);
  });

  it("ignora valor <= 0 (vira null)", async () => {
    requireAppUser.mockResolvedValue({ tenantId: "t1" });
    marcarVendido.mockResolvedValue({ moved: false });
    await POST(bodyReq({ valorBrl: 0 }), params);
    expect(marcarVendido).toHaveBeenCalledWith("t1", 5, null);
  });

  it("400 em id inválido", async () => {
    requireAppUser.mockResolvedValue({ tenantId: "t1" });
    const res = await POST(bodyReq({}), { params: { id: "abc" } });
    expect(res.status).toBe(400);
    expect(marcarVendido).not.toHaveBeenCalled();
  });

  it("502 quando o upstream falha", async () => {
    requireAppUser.mockResolvedValue({ tenantId: "t1" });
    marcarVendido.mockRejectedValue(new Error("upstream down"));
    const res = await POST(bodyReq({ valorBrl: 100 }), params);
    expect(res.status).toBe(502);
  });
});
