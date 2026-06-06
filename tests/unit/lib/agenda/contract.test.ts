import { describe, it, expect } from "vitest";
import { agendaItemSchema, BlockInput, RescheduleInput } from "@/lib/agenda/contract";

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

describe("BlockInput", () => {
  const validBlock = {
    start: "2026-06-10T09:00:00Z",
    end: "2026-06-10T10:00:00Z",
  };

  it("aceita start/end datetime válidos sem reason", () => {
    expect(() => BlockInput.parse(validBlock)).not.toThrow();
  });

  it("aceita reason opcional preenchido", () => {
    expect(() => BlockInput.parse({ ...validBlock, reason: "Almoço" })).not.toThrow();
  });

  it("rejeita reason com mais de 120 caracteres", () => {
    expect(() =>
      BlockInput.parse({ ...validBlock, reason: "x".repeat(121) }),
    ).toThrow();
  });

  it("rejeita start não-datetime (string livre)", () => {
    expect(() =>
      BlockInput.parse({ ...validBlock, start: "não-é-data" }),
    ).toThrow();
  });

  it("rejeita end não-datetime", () => {
    expect(() =>
      BlockInput.parse({ ...validBlock, end: "2026-06-10" }),
    ).toThrow();
  });

  it("rejeita sem start", () => {
    expect(() => BlockInput.parse({ end: validBlock.end })).toThrow();
  });
});

describe("RescheduleInput", () => {
  it("aceita newSlotIso datetime válido", () => {
    expect(() =>
      RescheduleInput.parse({ newSlotIso: "2026-06-15T14:00:00Z" }),
    ).not.toThrow();
  });

  it("rejeita newSlotIso não-datetime (data sem hora)", () => {
    expect(() =>
      RescheduleInput.parse({ newSlotIso: "2026-06-15" }),
    ).toThrow();
  });

  it("rejeita newSlotIso ausente", () => {
    expect(() => RescheduleInput.parse({})).toThrow();
  });
});
