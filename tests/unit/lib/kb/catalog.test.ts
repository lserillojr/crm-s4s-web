import { describe, it, expect } from "vitest";
import { KB_CATALOG, EDITABLE_KEYS } from "@/lib/kb/catalog";

describe("KB_CATALOG", () => {
  it("tem 9 blocos com keys únicas", () => {
    const keys = KB_CATALOG.map((s) => s.key);
    expect(keys.length).toBe(9);
    expect(new Set(keys).size).toBe(9);
  });
  it("editáveis = identidade, metodologia, servicos, faq", () => {
    expect(EDITABLE_KEYS).toEqual(["identidade", "metodologia", "servicos", "faq"]);
  });
  it("regras_odoo é travada", () => {
    expect(KB_CATALOG.find((s) => s.key === "regras_odoo")?.editable).toBe(false);
  });
});
