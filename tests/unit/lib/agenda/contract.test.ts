import { describe, it, expect } from "vitest";
import { agendaItemSchema } from "@/lib/agenda/contract";

describe("agendaItemSchema", () => {
  it("aceita payload válido", () => {
    const v = {
      appointments: [
        {
          id: "a",
          start: "2026-06-08T13:00:00Z",
          end: "2026-06-08T14:00:00Z",
          contactName: "Ana",
          status: "confirmado",
          source: "ia",
        },
      ],
      blocks: [],
    };
    expect(agendaItemSchema.parse(v)).toEqual(v);
  });

  it("aceita contactName/reason nulos e blocks preenchidos", () => {
    const v = {
      appointments: [
        {
          id: "a",
          start: "2026-06-08T13:00:00Z",
          end: "2026-06-08T14:00:00Z",
          contactName: null,
          status: "confirmado",
          source: "manual",
        },
      ],
      blocks: [
        { id: "b", start: "2026-06-08T15:00:00Z", end: "2026-06-08T16:00:00Z", reason: null },
      ],
    };
    expect(() => agendaItemSchema.parse(v)).not.toThrow();
  });

  it("rejeita appointments ausente", () => {
    expect(() => agendaItemSchema.parse({ blocks: [] })).toThrow();
  });
});
