// src/lib/api/chatwoot-client.ts
// Cliente HTTP do Chatwoot. As credenciais (api_access_token do tenant) vivem
// só aqui no servidor — nunca chegam ao device.
import { mergeAiState, type RawConversation, type RawMessage } from "./chatwoot-map";

export interface ChatwootClient {
  listOpenConversations(): Promise<RawConversation[]>;
  getConversation(id: number): Promise<RawConversation>;
  getMessages(id: number): Promise<RawMessage[]>;
  getAttachmentUrl(convId: number, attId: number): Promise<string | null>;
  postReply(id: number, content: string): Promise<void>;
  setAiState(id: number, state: string): Promise<void>;
}

export function createChatwootClient(cfg: { baseUrl: string; accountId: number; token: string }): ChatwootClient {
  const base = `${cfg.baseUrl.replace(/\/$/, "")}/api/v1/accounts/${cfg.accountId}`;
  const headers = { "Content-Type": "application/json", api_access_token: cfg.token };

  // cache: "no-store" — Next 14 cacheia fetch de servidor por padrão; sem isto a
  // timeline/lista do app congela numa resposta antiga do Chatwoot (mesma URL).
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${base}${path}`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`chatwoot GET ${path} -> ${res.status}`);
    return (await res.json()) as T;
  }
  async function post(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) throw new Error(`chatwoot POST ${path} -> ${res.status}`);
  }

  return {
    async listOpenConversations() {
      const data = await get<{ data?: { payload?: RawConversation[] } }>(
        `/conversations?status=open&assignee_type=all`,
      );
      return data.data?.payload ?? [];
    },
    getConversation(id) {
      return get<RawConversation>(`/conversations/${id}`);
    },
    async getMessages(id) {
      const data = await get<{ payload?: RawMessage[] }>(`/conversations/${id}/messages`);
      return data.payload ?? [];
    },
    async getAttachmentUrl(convId, attId) {
      const data = await get<{ payload?: RawMessage[] }>(`/conversations/${convId}/messages`);
      const att = (data.payload ?? [])
        .flatMap((m) => m.attachments ?? [])
        .find((a) => a.id === attId);
      if (!att?.data_url) return null;
      return att.data_url.startsWith("http")
        ? att.data_url
        : `${cfg.baseUrl.replace(/\/$/, "")}${att.data_url}`;
    },
    postReply(id, content) {
      return post(`/conversations/${id}/messages`, { content, message_type: "outgoing", private: false });
    },
    async setAiState(id, state) {
      const conv = await get<RawConversation>(`/conversations/${id}`);
      const merged = mergeAiState(conv.custom_attributes ?? {}, state);
      await post(`/conversations/${id}/custom_attributes`, { custom_attributes: merged });
    },
  };
}
