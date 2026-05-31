import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

beforeEach(() => { vi.resetModules(); authMock.mockReset(); (global.fetch as any) = vi.fn(); });
afterEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

async function loadRoute(n8nBaseUrl: string | undefined = "https://n8n.example") {
  vi.doMock("@/lib/env", () => ({
    env: {
      N8N_API_BASE_URL: n8nBaseUrl,
      N8N_AI_SERVICE_TOKEN: "test-token",
    },
  }));
  return import("@/app/api/dashboard/summary/route");
}

describe("GET /api/dashboard/summary", () => {
  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    expect(res.status).toBe(401);
  });

  it("proxy: injeta userName da sessão e repassa o resto do WF", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({
      greeting: { userName: "", businessName: "Salão da Maria" },
      weekConversations: 47,
      conversationsToday: { count: 12, trend: "up", vsYesterday: 3 },
      leadsNew: { count: 2, names: ["Ana", "Bia"] },
      nextMeeting: null,
    }), { status: 200 }));
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.greeting.userName).toBe("João");
    expect(body.greeting.businessName).toBe("Salão da Maria");
    expect(body.conversationsToday.count).toBe(12);
  });

  it("WF erro → 200 degradado (cards null, página não quebra)", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(new Response("boom", { status: 502 }));
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.conversationsToday).toBeNull();
    expect(body.leadsNew).toBeNull();
    expect(body.nextMeeting).toBeNull();
    expect(body.greeting.userName).toBe("João");
  });
});
