import { describe, it, expect } from "vitest";
import { deriveSelo, mapListItem, type RawConversation } from "@/lib/api/chatwoot-map";

function conv(over: Partial<RawConversation> = {}): RawConversation {
  return { id: 1, status: "open", meta: { sender: { name: "Ana" } }, custom_attributes: {}, ...over };
}

describe("deriveSelo", () => {
  it("resolvida quando a conversa está resolvida no Chatwoot", () => {
    expect(deriveSelo(conv({ status: "resolved" }))).toBe("resolvida");
  });
  it("assumida quando o MEI assumiu (ai_state escalated)", () => {
    expect(deriveSelo(conv({ custom_attributes: { ai_state: "escalated" } }))).toBe("assumida");
  });
  it("precisa quando há handoff aberto e o MEI ainda não assumiu", () => {
    expect(deriveSelo(conv({ custom_attributes: { handoff_status: "aberto" } }))).toBe("precisa");
  });
  it("ia quando a IA está cuidando (sem handoff)", () => {
    expect(deriveSelo(conv({ custom_attributes: { ai_state: "active" } }))).toBe("ia");
  });
});

describe("mapListItem estendido", () => {
  it("usa a última mensagem de texto como prévia e last_activity_at como horário", () => {
    const c = conv({
      last_activity_at: 1_700_000_000,
      messages: [
        { id: 1, message_type: 0, content: "oi" },
        { id: 2, message_type: 1, content: "Posso te ajudar com o agendamento?" },
      ],
      custom_attributes: { ai_summary: "resumo antigo", ai_state: "active" },
    });
    const dto = mapListItem(c);
    expect(dto.selo).toBe("ia");
    expect(dto.ultimaMensagem).toBe("Posso te ajudar com o agendamento?");
    expect(dto.em).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("rotula mídia quando a última mensagem não tem texto", () => {
    const c = conv({
      messages: [{ id: 3, message_type: 0, content: "", attachments: [{ id: 7, file_type: "image" }] }],
    });
    expect(mapListItem(c).ultimaMensagem).toBe("Foto");
  });

  it("cai para ai_summary quando não há mensagens", () => {
    const c = conv({ custom_attributes: { ai_summary: "cliente quer preço" } });
    expect(mapListItem(c).ultimaMensagem).toBe("cliente quer preço");
  });
});
