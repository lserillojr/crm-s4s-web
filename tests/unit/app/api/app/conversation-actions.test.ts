import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAppUser = vi.fn();
const chatwootForTenant = vi.fn();
vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (r: Request) => requireAppUser(r) }));
vi.mock("@/lib/api/conversations-service", () => ({ chatwootForTenant: (t: string) => chatwootForTenant(t) }));

import { POST as reply } from "@/app/api/app/conversations/[id]/reply/route";
import { POST as assume } from "@/app/api/app/conversations/[id]/assume/route";
import { POST as returnToAi } from "@/app/api/app/conversations/[id]/return-to-ai/route";

const params = { params: { id: "5" } };
let postReply: ReturnType<typeof vi.fn>;
let setAiState: ReturnType<typeof vi.fn>;

beforeEach(() => {
  requireAppUser.mockReset(); chatwootForTenant.mockReset();
  postReply = vi.fn().mockResolvedValue(undefined);
  setAiState = vi.fn().mockResolvedValue(undefined);
  requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t1" });
  chatwootForTenant.mockResolvedValue({ postReply, setAiState });
});

function bodyReq(obj: unknown) {
  return new Request("http://x", { method: "POST", body: JSON.stringify(obj), headers: { "Content-Type": "application/json" } });
}

describe("reply", () => {
  it("posta a resposta E seta ai_state=escalated; devolve posse", async () => {
    const res = await reply(bodyReq({ texto: "olá" }), params);
    expect(res.status).toBe(200);
    expect(postReply).toHaveBeenCalledWith(5, "olá");
    expect(setAiState).toHaveBeenCalledWith(5, "escalated");
    expect(await res.json()).toEqual({ ok: true, status: "posse", aiState: "escalated" });
  });
  it("400 com texto vazio", async () => {
    const res = await reply(bodyReq({ texto: "" }), params);
    expect(res.status).toBe(400);
    expect(postReply).not.toHaveBeenCalled();
  });
  it("401 sem auth", async () => {
    requireAppUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) });
    const res = await reply(bodyReq({ texto: "x" }), params);
    expect(res.status).toBe(401);
  });
});

describe("assume", () => {
  it("seta escalated; devolve posse", async () => {
    const res = await assume(new Request("http://x", { method: "POST" }), params);
    expect(setAiState).toHaveBeenCalledWith(5, "escalated");
    expect(await res.json()).toEqual({ ok: true, status: "posse", aiState: "escalated" });
  });
});

describe("return-to-ai", () => {
  it("seta active; devolve aberto", async () => {
    const res = await returnToAi(new Request("http://x", { method: "POST" }), params);
    expect(setAiState).toHaveBeenCalledWith(5, "active");
    expect(await res.json()).toEqual({ ok: true, status: "aberto", aiState: "active" });
  });
});
