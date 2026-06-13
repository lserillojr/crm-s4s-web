import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getTenantIdMock = vi.fn();
const getTokensMock = vi.fn();
const deleteTokensMock = vi.fn();
const sendPushMock = vi.fn();

vi.mock("@/lib/db/tenants", () => ({ getTenantIdByAccountId: (...a: unknown[]) => getTenantIdMock(...a) }));
vi.mock("@/lib/db/device-tokens", () => ({
  getTokensForTenantOwner: (...a: unknown[]) => getTokensMock(...a),
  deleteTokens: (...a: unknown[]) => deleteTokensMock(...a),
}));
vi.mock("@/lib/push/send", () => ({ sendPush: (...a: unknown[]) => sendPushMock(...a) }));
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({}) }));

beforeEach(() => {
  vi.resetModules();
  getTenantIdMock.mockReset(); getTokensMock.mockReset(); deleteTokensMock.mockReset(); sendPushMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

async function load(secret: string | undefined = "s3cr3t") {
  vi.doMock("@/lib/env", () => ({ env: { PUSH_WEBHOOK_SECRET: secret } }));
  return import("@/app/api/push/handoff/route");
}
function postReq(body: unknown, secret = "s3cr3t") {
  return new Request("http://x/api/push/handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-push-secret": secret },
    body: JSON.stringify(body),
  });
}
const validBody = {
  account_id: 34, conversation_id: 101, tenant_slug: "demo",
  tipo: "escalacao", titulo: "Cliente precisa de você", corpo: "Maria — orçamento", silencioso: false,
};

describe("POST /api/push/handoff", () => {
  it("401 segredo errado (não resolve tenant)", async () => {
    const { POST } = await load();
    const res = await POST(postReq(validBody, "errado"));
    expect(res.status).toBe(401);
    expect(getTenantIdMock).not.toHaveBeenCalled();
  });
  it("400 body inválido (tipo fora do enum)", async () => {
    const { POST } = await load();
    const res = await POST(postReq({ ...validBody, tipo: "xpto" }));
    expect(res.status).toBe(400);
  });
  it("skipped tenant_not_found quando account_id não resolve", async () => {
    getTenantIdMock.mockResolvedValue(null);
    const { POST } = await load();
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: "tenant_not_found" });
    expect(sendPushMock).not.toHaveBeenCalled();
  });
  it("skipped no_devices quando owner sem device", async () => {
    getTenantIdMock.mockResolvedValue("ten-1");
    getTokensMock.mockResolvedValue([]);
    const { POST } = await load();
    const res = await POST(postReq(validBody));
    expect(await res.json()).toMatchObject({ skipped: "no_devices" });
    expect(sendPushMock).not.toHaveBeenCalled();
  });
  it("happy: envia push com data do handoff e poda mortos", async () => {
    getTenantIdMock.mockResolvedValue("ten-1");
    getTokensMock.mockResolvedValue(["good", "bad"]);
    sendPushMock.mockResolvedValue({ deadTokens: ["bad"] });
    const { POST } = await load();
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sent: true, count: 2, pruned: 1 });
    const [tokens, payload] = sendPushMock.mock.calls[0]!;
    expect(tokens).toEqual(["good", "bad"]);
    expect(payload).toMatchObject({
      title: "Cliente precisa de você", body: "Maria — orçamento", silent: false,
      data: { type: "handoff", account_id: 34, conversation_id: 101, tenant_slug: "demo", tipo: "escalacao" },
    });
    expect(deleteTokensMock).toHaveBeenCalledWith(expect.anything(), ["bad"]);
  });
  it("lead_quente: inclui acao=marcar-vendido no data (deep-link p/ fechar)", async () => {
    getTenantIdMock.mockResolvedValue("ten-1");
    getTokensMock.mockResolvedValue(["good"]);
    sendPushMock.mockResolvedValue({ deadTokens: [] });
    const { POST } = await load();
    await POST(postReq({ ...validBody, tipo: "lead_quente" }));
    const [, payload] = sendPushMock.mock.calls[0]!;
    expect(payload.data).toMatchObject({ type: "handoff", tipo: "lead_quente", acao: "marcar-vendido" });
  });
  it("escalacao: NÃO inclui acao no data (handoff comum não abre o campo R$)", async () => {
    getTenantIdMock.mockResolvedValue("ten-1");
    getTokensMock.mockResolvedValue(["good"]);
    sendPushMock.mockResolvedValue({ deadTokens: [] });
    const { POST } = await load();
    await POST(postReq(validBody)); // tipo: escalacao
    const [, payload] = sendPushMock.mock.calls[0]!;
    expect(payload.data.acao).toBeUndefined();
  });
});
