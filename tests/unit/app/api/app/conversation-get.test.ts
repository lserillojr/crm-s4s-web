import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAppUser = vi.fn();
const chatwootForTenant = vi.fn();
vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (r: Request) => requireAppUser(r) }));
vi.mock("@/lib/api/conversations-service", () => ({ chatwootForTenant: (t: string) => chatwootForTenant(t) }));

import { GET } from "@/app/api/app/conversations/[id]/route";

beforeEach(() => { requireAppUser.mockReset(); chatwootForTenant.mockReset(); });

const params = { params: { id: "5" } };

describe("GET /api/app/conversations/[id]", () => {
  it("401 sem auth", async () => {
    requireAppUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) });
    const res = await GET(new Request("http://x"), params);
    expect(res.status).toBe(401);
  });

  it("400 com id inválido (não-inteiro ou <= 0)", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    const r1 = await GET(new Request("http://x"), { params: { id: "abc" } });
    expect(r1.status).toBe(400);
    expect(await r1.json()).toEqual({ error: "bad_id" });
    const r2 = await GET(new Request("http://x"), { params: { id: "0" } });
    expect(r2.status).toBe(400);
    expect(chatwootForTenant).not.toHaveBeenCalled();
  });

  it("502 quando o upstream falha", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockRejectedValue(new Error("boom"));
    const res = await GET(new Request("http://x"), params);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstream");
  });

  it("monta a conversa (resumo + timeline classificada)", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({
      getConversation: async () => ({ id: 5, status: "open", meta: { sender: { name: "Ana" } }, custom_attributes: { ai_state: "escalated", ai_summary: "resumo" } }),
      getMessages: async () => [
        { id: 1, message_type: 0, content: "oi", created_at: 1700000000 },
        { id: 2, message_type: 1, content: "ia", content_attributes: { s4s_ai_sent: true } },
      ],
    });
    const res = await GET(new Request("http://x"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: 5, status: "posse", aiState: "escalated", aiSummary: "resumo", contato: "Ana" });
    expect(body.mensagens.map((m: { autor: string }) => m.autor)).toEqual(["cliente", "ia"]);
  });
});
