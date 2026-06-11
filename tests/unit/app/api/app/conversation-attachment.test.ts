import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAppUser = vi.fn();
const chatwootForTenant = vi.fn();
vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (r: Request) => requireAppUser(r) }));
vi.mock("@/lib/api/conversations-service", () => ({ chatwootForTenant: (t: string) => chatwootForTenant(t) }));

import { GET } from "@/app/api/app/conversations/[id]/attachments/[attId]/route";

beforeEach(() => { requireAppUser.mockReset(); chatwootForTenant.mockReset(); });

const params = (id: string, attId: string) => ({ params: { id, attId } });

describe("GET /api/app/conversations/[id]/attachments/[attId]", () => {
  it("401 sem auth", async () => {
    requireAppUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) });
    const res = await GET(new Request("http://x"), params("5", "9"));
    expect(res.status).toBe(401);
  });

  it("400 com ids inválidos", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    const res = await GET(new Request("http://x"), params("abc", "9"));
    expect(res.status).toBe(400);
    expect(chatwootForTenant).not.toHaveBeenCalled();
  });

  it("404 quando o attachment não existe", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({ getAttachmentUrl: async () => null });
    const res = await GET(new Request("http://x"), params("5", "9"));
    expect(res.status).toBe(404);
  });

  it("200 faz streaming com o content-type do upstream", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({ getAttachmentUrl: async () => "https://cw/x.jpg" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("bytes-da-imagem", { status: 200, headers: { "content-type": "image/jpeg" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(new Request("http://x"), params("5", "9"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(await res.text()).toBe("bytes-da-imagem");
  });

  it("502 quando o upstream falha", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    chatwootForTenant.mockResolvedValue({ getAttachmentUrl: async () => "https://cw/x.jpg" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    const res = await GET(new Request("http://x"), params("5", "9"));
    expect(res.status).toBe(502);
  });
});
