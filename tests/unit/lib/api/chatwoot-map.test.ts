import { describe, it, expect } from "vitest";
import {
  classifyAutor, classifyTipo, deriveStatus, isHandoff,
  mapListItem, mapConversa, mergeAiState,
  type RawMessage, type RawConversation,
} from "@/lib/api/chatwoot-map";

const conv = (ca: Record<string, unknown>, status = "open", name = "Maria"): RawConversation => ({
  id: 7, status, meta: { sender: { name } }, custom_attributes: ca,
});

describe("classifyAutor", () => {
  it("incoming = cliente", () => {
    expect(classifyAutor({ id: 1, message_type: 0 })).toBe("cliente");
  });
  it("outgoing carimbado pela IA = ia", () => {
    expect(classifyAutor({ id: 1, message_type: 1, content_attributes: { s4s_ai_sent: true } })).toBe("ia");
  });
  it("outgoing sem carimbo = humano", () => {
    expect(classifyAutor({ id: 1, message_type: 1 })).toBe("humano");
  });
  it("activity (type 2) = null", () => {
    expect(classifyAutor({ id: 1, message_type: 2 })).toBeNull();
  });
});

describe("classifyTipo", () => {
  it("com conteúdo textual = texto", () => {
    expect(classifyTipo({ id: 1, message_type: 0, content: "oi" })).toBe("texto");
  });
  it("attachment de imagem = imagem", () => {
    expect(classifyTipo({ id: 1, message_type: 0, content: "", attachments: [{ file_type: "image" }] })).toBe("imagem");
  });
  it("attachment de audio = audio", () => {
    expect(classifyTipo({ id: 1, message_type: 0, attachments: [{ file_type: "audio" }] })).toBe("audio");
  });
  it("attachment desconhecido com anexo = documento", () => {
    expect(classifyTipo({ id: 1, message_type: 0, attachments: [{ file_type: "story_mention" }] })).toBe("documento");
  });
});

describe("deriveStatus", () => {
  it("resolved -> resolvido", () => expect(deriveStatus(conv({}, "resolved"))).toBe("resolvido"));
  it("escalated -> posse", () => expect(deriveStatus(conv({ ai_state: "escalated" }))).toBe("posse"));
  it("aberto por padrão", () => expect(deriveStatus(conv({ ai_state: "active" }))).toBe("aberto"));
});

describe("isHandoff", () => {
  it("escalated entra", () => expect(isHandoff(conv({ ai_state: "escalated" }))).toBe(true));
  it("handoff_status aberto entra", () => expect(isHandoff(conv({ handoff_status: "aberto" }))).toBe(true));
  it("conversa comum fica de fora", () => expect(isHandoff(conv({ ai_state: "active" }))).toBe(false));
});

describe("mapListItem", () => {
  it("monta o item da lista", () => {
    const item = mapListItem(conv({ ai_state: "escalated", handoff_motivo: "takeover_humano", ai_summary: "Cliente quer orçamento", handoff_em: "2026-06-07T10:00:00Z" }));
    expect(item).toEqual({
      id: 7, contato: "Maria", motivo: "takeover_humano",
      resumoPreview: "Cliente quer orçamento", status: "posse",
      handoffEm: "2026-06-07T10:00:00Z",
    });
  });
  it("contato cai para 'Cliente' sem nome", () => {
    expect(mapListItem({ id: 7, custom_attributes: {} }).contato).toBe("Cliente");
  });
});

describe("mapConversa", () => {
  it("monta conversa + filtra activities", () => {
    const msgs: RawMessage[] = [
      { id: 1, message_type: 0, content: "oi", created_at: 1700000000 },
      { id: 2, message_type: 1, content: "resposta IA", content_attributes: { s4s_ai_sent: true }, created_at: 1700000100 },
      { id: 3, message_type: 2, content: "Conversa atribuída" },
      { id: 4, message_type: 1, content: "eu respondendo", created_at: 1700000200 },
    ];
    const dto = mapConversa(conv({ ai_state: "escalated", ai_summary: "resumo" }), msgs);
    expect(dto.status).toBe("posse");
    expect(dto.aiState).toBe("escalated");
    expect(dto.aiSummary).toBe("resumo");
    expect(dto.contato).toBe("Maria");
    expect(dto.mensagens.map((m) => m.autor)).toEqual(["cliente", "ia", "humano"]);
    expect(dto.mensagens[0]!.em).toBe(new Date(1700000000 * 1000).toISOString());
  });
});

describe("mergeAiState", () => {
  it("preserva atributos existentes (regra de ouro)", () => {
    expect(mergeAiState({ ai_summary: "x", ai_state: "active" }, "escalated"))
      .toEqual({ ai_summary: "x", ai_state: "escalated" });
  });
});
