import { describe, it, expect, vi, afterEach } from "vitest";
import { createChatwootClient } from "@/lib/api/chatwoot-client";

const CFG = { baseUrl: "https://chat.example.com/", accountId: 2, token: "tok-123" };

function mockFetchOnce(json: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status, json: async () => json });
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("createChatwootClient", () => {
  it("listOpenConversations chama a URL certa com o header e devolve payload", async () => {
    const fetchMock = mockFetchOnce({ data: { payload: [{ id: 1 }] } });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    const out = await cw.listOpenConversations();
    expect(out).toEqual([{ id: 1 }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://chat.example.com/api/v1/accounts/2/conversations?status=open&assignee_type=all");
    expect((init as RequestInit).headers).toMatchObject({ api_access_token: "tok-123" });
  });

  it("getConversation chama /conversations/{id} e devolve a conversa", async () => {
    const fetchMock = mockFetchOnce({ id: 5, custom_attributes: { ai_state: "escalated" } });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    const conv = await cw.getConversation(5);
    expect(conv).toMatchObject({ id: 5 });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://chat.example.com/api/v1/accounts/2/conversations/5");
  });

  it("getMessages devolve payload", async () => {
    const fetchMock = mockFetchOnce({ payload: [{ id: 9, message_type: 0 }] });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    expect(await cw.getMessages(5)).toEqual([{ id: 9, message_type: 0 }]);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://chat.example.com/api/v1/accounts/2/conversations/5/messages");
  });

  it("postReply posta como outgoing sem carimbo s4s_ai_sent", async () => {
    const fetchMock = mockFetchOnce({});
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    await cw.postReply(5, "olá");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://chat.example.com/api/v1/accounts/2/conversations/5/messages");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ content: "olá", message_type: "outgoing", private: false });
    expect(body.content_attributes).toBeUndefined();
  });

  it("setAiState faz GET atuais, mescla e POSTa custom_attributes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 5, custom_attributes: { ai_summary: "x", ai_state: "active" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    await cw.setAiState(5, "escalated");
    const [, init] = fetchMock.mock.calls[1]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      custom_attributes: { ai_summary: "x", ai_state: "escalated" },
    });
  });

  it("erro HTTP vira throw", async () => {
    vi.stubGlobal("fetch", mockFetchOnce({}, false, 500));
    const cw = createChatwootClient(CFG);
    await expect(cw.getMessages(5)).rejects.toThrow(/500/);
  });
});

describe("getAttachmentUrl (Fase B)", () => {
  it("retorna o data_url absoluto do attachment encontrado", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ payload: [
        { id: 1, message_type: 0, attachments: [{ id: 99, file_type: "image", data_url: "https://cw.example/rails/x.jpg" }] },
      ] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    expect(await cw.getAttachmentUrl(5, 99)).toBe("https://cw.example/rails/x.jpg");
  });

  it("prefixa baseUrl quando o data_url é relativo", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ payload: [
        { id: 1, message_type: 0, attachments: [{ id: 42, file_type: "audio", data_url: "/rails/a.ogg" }] },
      ] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    expect(await cw.getAttachmentUrl(5, 42)).toBe("https://chat.example.com/rails/a.ogg");
  });

  it("retorna null quando o attachment não existe", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ payload: [{ id: 1, message_type: 0 }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const cw = createChatwootClient(CFG);
    expect(await cw.getAttachmentUrl(5, 99)).toBeNull();
  });
});
