import { describe, it, expect } from "vitest";
import { agendaItemSchema, BlockInput, RescheduleInput, CreateAppointmentInput } from "@/lib/agenda/contract";

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

  it("aceita datetime com offset local (o que os forms enviam)", () => {
    expect(() =>
      BlockInput.parse({
        start: "2026-06-10T09:00:00-03:00",
        end: "2026-06-10T10:00:00-03:00",
      }),
    ).not.toThrow();
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

  it("aceita newSlotIso com offset local (o que o form envia)", () => {
    expect(() =>
      RescheduleInput.parse({ newSlotIso: "2026-06-15T14:00:00-03:00" }),
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

describe("CreateAppointmentInput", () => {
  it("aceita ISO com offset + duração + título", () => {
    const r = CreateAppointmentInput.safeParse({
      startIso: "2026-09-10T13:00:00-03:00",
      durationMin: 30,
      contactName: "Ana",
      title: "corte",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita duração não-positiva", () => {
    const r = CreateAppointmentInput.safeParse({
      startIso: "2026-09-10T13:00:00-03:00",
      durationMin: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("agendaItemSchema title", () => {
  it("aceita appointment com title nulo", () => {
    const r = agendaItemSchema.safeParse({
      appointments: [{ id: "1", start: "2026-09-10T13:00:00-03:00",
        end: "2026-09-10T13:30:00-03:00", contactName: "Ana", title: null,
        status: "confirmado", source: "manual" }],
      blocks: [],
    });
    expect(r.success).toBe(true);
  });
});

describe("CreateAppointmentInput online", () => {
  it("aceita online boolean", () => {
    const r = CreateAppointmentInput.safeParse({
      startIso: "2026-09-10T13:00:00-03:00", durationMin: 30, online: true,
    });
    expect(r.success).toBe(true);
  });
  it("online é opcional", () => {
    const r = CreateAppointmentInput.safeParse({
      startIso: "2026-09-10T13:00:00-03:00", durationMin: 30,
    });
    expect(r.success).toBe(true);
  });
});

describe("agendaItemSchema meetLink", () => {
  it("aceita appointment com meetLink", () => {
    const r = agendaItemSchema.safeParse({
      appointments: [{ id: "1", start: "2026-09-10T13:00:00-03:00",
        end: "2026-09-10T13:30:00-03:00", contactName: "Ana", title: null,
        meetLink: "https://meet.google.com/abc", status: "confirmado", source: "manual" }],
      blocks: [],
    });
    expect(r.success).toBe(true);
    // o campo precisa ser PRESERVADO (não stripado) — o painel lê data.meetLink
    if (r.success) {
      expect(r.data.appointments[0]?.meetLink).toBe("https://meet.google.com/abc");
    }
  });
});
