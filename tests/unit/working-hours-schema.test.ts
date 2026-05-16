import { describe, expect, it } from "vitest";
import {
  formatWeeklyHoursSummary,
  weeklyHoursDefaults,
  weeklyHoursSchema,
  type WeeklyHours,
} from "@/lib/working-hours/schema";

function cloneDefaults(): WeeklyHours {
  return structuredClone(weeklyHoursDefaults);
}

describe("weeklyHoursSchema", () => {
  it("aceita os defaults", () => {
    const parsed = weeklyHoursSchema.safeParse(weeklyHoursDefaults);
    expect(parsed.success).toBe(true);
  });

  it("rejeita open >= close em dia aberto", () => {
    const data = cloneDefaults();
    data.monday = { closed: false, open: "18:00", close: "09:00" };
    expect(weeklyHoursSchema.safeParse(data).success).toBe(false);
  });

  it("rejeita open === close em dia aberto", () => {
    const data = cloneDefaults();
    data.tuesday = { closed: false, open: "09:00", close: "09:00" };
    expect(weeklyHoursSchema.safeParse(data).success).toBe(false);
  });

  it("aceita open == close se closed=true (não importa)", () => {
    const data = cloneDefaults();
    data.sunday = { closed: true, open: "09:00", close: "09:00" };
    expect(weeklyHoursSchema.safeParse(data).success).toBe(true);
  });

  it("rejeita formato de horário inválido", () => {
    const data = cloneDefaults();
    data.monday = { closed: false, open: "9:00", close: "18:00" };
    expect(weeklyHoursSchema.safeParse(data).success).toBe(false);
  });
});

describe("formatWeeklyHoursSummary", () => {
  it("compacta Seg-Sex 09:00-18:00 corretamente", () => {
    const summary = formatWeeklyHoursSummary(weeklyHoursDefaults);
    expect(summary).toContain("Seg-Sex 09:00-18:00");
    expect(summary).toContain("Sáb 09:00-13:00");
    expect(summary).toContain("Dom fechado");
    expect(summary).toBe("Seg-Sex 09:00-18:00 · Sáb 09:00-13:00 · Dom fechado");
  });

  it("trata domingo fechado como 'Dom fechado'", () => {
    const data = cloneDefaults();
    // domingo já vem closed nos defaults; garantia explícita do label
    expect(formatWeeklyHoursSummary(data)).toMatch(/Dom fechado$/);
  });

  it("lida com semana toda fechada → 'Fechado'", () => {
    const allClosed: WeeklyHours = {
      monday: { closed: true, open: "09:00", close: "18:00" },
      tuesday: { closed: true, open: "09:00", close: "18:00" },
      wednesday: { closed: true, open: "09:00", close: "18:00" },
      thursday: { closed: true, open: "09:00", close: "18:00" },
      friday: { closed: true, open: "09:00", close: "18:00" },
      saturday: { closed: true, open: "09:00", close: "18:00" },
      sunday: { closed: true, open: "09:00", close: "18:00" },
    };
    expect(formatWeeklyHoursSummary(allClosed)).toBe("Fechado");
  });

  it("compacta dias consecutivos com mesmo horário, separa quando difere", () => {
    const data: WeeklyHours = {
      monday: { closed: false, open: "08:00", close: "12:00" },
      tuesday: { closed: false, open: "08:00", close: "12:00" },
      wednesday: { closed: false, open: "08:00", close: "12:00" },
      thursday: { closed: false, open: "14:00", close: "20:00" },
      friday: { closed: false, open: "14:00", close: "20:00" },
      saturday: { closed: true, open: "09:00", close: "18:00" },
      sunday: { closed: true, open: "09:00", close: "18:00" },
    };
    expect(formatWeeklyHoursSummary(data)).toBe(
      "Seg-Qua 08:00-12:00 · Qui-Sex 14:00-20:00 · Sáb-Dom fechado"
    );
  });
});
