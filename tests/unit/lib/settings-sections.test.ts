import { describe, it, expect } from "vitest";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

describe("SETTINGS_SECTIONS", () => {
  it("expõe as seções de Configurações na ordem da jornada", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.href)).toEqual([
      "/settings/integracoes",
      "/settings/kb",
      "/settings/catalogo",
      "/settings/working-hours",
      "/settings/acompanhamento",
      "/settings/funil",
    ]);
  });

  it("cada seção tem label e descrição não-vazios", () => {
    for (const s of SETTINGS_SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  it("rotula a base de conhecimento sem jargão técnico (sem 'KB')", () => {
    const kb = SETTINGS_SECTIONS.find((s) => s.href === "/settings/kb");
    expect(kb?.label).toBe("Base de Conhecimento");
  });
});
