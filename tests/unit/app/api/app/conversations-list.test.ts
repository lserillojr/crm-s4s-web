import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAppUser = vi.fn();
const chatwootForTenant = vi.fn();
vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (r: Request) => requireAppUser(r) }));
vi.mock("@/lib/api/conversations-service", () => ({ chatwootForTenant: (t: string) => chatwootForTenant(t) }));

import { GET } from "@/app/api/app/conversations/route";

beforeEach(() => { requireAppUser.mockReset(); chatwootForTenant.mockReset(); });

function req() { return new Request("http://x/api/app/conversations?status=handoff"); }

describe("GET /api/app/conversations", () => {
  it("401 sem auth", async () => {
    requireAppUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("filtra só handoff e mapeia", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({
      listOpenConversations: async () => [
        { id: 1, status: "open", meta: { sender: { name: "Ana" } }, custom_attributes: { ai_state: "escalated", handoff_motivo: "takeover_humano", ai_summary: "quer preço" } },
        { id: 2, status: "open", custom_attributes: { ai_state: "active" } },
      ],
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 1, contato: "Ana", status: "posse", motivo: "takeover_humano" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("502 quando o upstream falha", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockRejectedValue(new Error("boom"));
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstream");
  });

  it("filter=todas devolve todas as abertas (handoff e não-handoff)", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({
      listOpenConversations: async () => [
        { id: 1, status: "open", custom_attributes: { ai_state: "escalated" } },     // assumida
        { id: 2, status: "open", custom_attributes: { handoff_status: "aberto" } },  // precisa
        { id: 3, status: "open", custom_attributes: { ai_state: "active" } },         // ia
      ],
    });
    const res = await GET(new Request("http://x/api/app/conversations?filter=todas"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((c: { selo: string }) => c.selo).sort()).toEqual(["assumida", "ia", "precisa"]);
  });

  it("sem filter (default) devolve só needs_you (handoff)", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({
      listOpenConversations: async () => [
        { id: 1, status: "open", custom_attributes: { ai_state: "escalated" } },
        { id: 3, status: "open", custom_attributes: { ai_state: "active" } },
      ],
    });
    const res = await GET(new Request("http://x/api/app/conversations"));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(1);
  });

  it("502 não vaza detail no corpo", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockRejectedValue(new Error("connection refused 10.0.0.5:5432 senha=xyz"));
    const res = await GET(new Request("http://x/api/app/conversations"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream");
    expect(body.detail).toBeUndefined();
  });
});
