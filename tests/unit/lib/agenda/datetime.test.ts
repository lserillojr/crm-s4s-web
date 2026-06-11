import { describe, it, expect } from "vitest";
import { localInputToIso, toLocalInput } from "@/lib/agenda/datetime";

describe("localInputToIso", () => {
  it("converte datetime-local em ISO com offset local (não 'Z')", () => {
    const iso = localInputToIso("2026-09-10T13:00");
    expect(iso).toMatch(/^2026-09-10T13:00:00[+-]\d{2}:\d{2}$/);
  });
  it("string vazia → vazio", () => {
    expect(localInputToIso("")).toBe("");
  });
});

describe("toLocalInput", () => {
  it("Date local → 'YYYY-MM-DDTHH:mm'", () => {
    const s = toLocalInput(new Date(2026, 8, 10, 9, 5));
    expect(s).toBe("2026-09-10T09:05");
  });
});
