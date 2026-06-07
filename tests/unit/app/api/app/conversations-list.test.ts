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
});
