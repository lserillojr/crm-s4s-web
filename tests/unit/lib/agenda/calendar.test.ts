import { describe, it, expect } from "vitest";
import { startOfWeek, addDays, weekDays, dayIndexOf, cardGeometry } from "@/lib/agenda/calendar";

describe("startOfWeek", () => {
  it("volta pra segunda-feira da semana (quarta 10/06/2026 → seg 08/06)", () => {
    const wed = new Date(2026, 5, 10, 15, 30);
    const mon = startOfWeek(wed);
    expect(mon.getFullYear()).toBe(2026);
    expect(mon.getMonth()).toBe(5);
    expect(mon.getDate()).toBe(8);
    expect(mon.getHours()).toBe(0);
    expect(mon.getMinutes()).toBe(0);
  });
  it("segunda continua na própria segunda", () => {
    const mon = new Date(2026, 5, 8, 9, 0);
    expect(startOfWeek(mon).getDate()).toBe(8);
  });
  it("domingo volta pra segunda anterior (dom 14/06 → seg 08/06)", () => {
    const sun = new Date(2026, 5, 14, 12, 0);
    expect(startOfWeek(sun).getDate()).toBe(8);
  });
});

describe("weekDays", () => {
  it("gera 6 dias (seg–sáb) a partir da segunda", () => {
    const days = weekDays(new Date(2026, 5, 8), 6);
    expect(days).toHaveLength(6);
    expect(days.at(0)?.getDate()).toBe(8);
    expect(days.at(5)?.getDate()).toBe(13);
  });
});

describe("addDays", () => {
  it("soma dias preservando a hora", () => {
    const d = addDays(new Date(2026, 5, 8, 10, 0), 2);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(10);
  });
});

describe("dayIndexOf", () => {
  it("acha a coluna do dia; -1 fora da semana", () => {
    const days = weekDays(new Date(2026, 5, 8), 6);
    expect(dayIndexOf(new Date(2026, 5, 10, 14, 0), days)).toBe(2);
    expect(dayIndexOf(new Date(2026, 5, 20, 14, 0), days)).toBe(-1);
  });
});

describe("cardGeometry", () => {
  const gridStartHour = 7;
  const pxPerHour = 48;
  it("posiciona 09:00–10:00 com grade começando às 07h", () => {
    const g = cardGeometry(new Date(2026, 5, 8, 9, 0), new Date(2026, 5, 8, 10, 0), gridStartHour, pxPerHour);
    expect(g.topPx).toBe(2 * 48);
    expect(g.heightPx).toBe(48);
  });
  it("aplica altura mínima para eventos curtos (15 min)", () => {
    const g = cardGeometry(new Date(2026, 5, 8, 9, 0), new Date(2026, 5, 8, 9, 15), gridStartHour, pxPerHour);
    expect(g.heightPx).toBeGreaterThanOrEqual(18);
  });
});
