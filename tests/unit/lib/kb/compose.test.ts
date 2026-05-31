import { describe, it, expect } from "vitest";
import { composeKb, mergeEditable, initSections, kbByteLength } from "@/lib/kb/compose";
import type { KbSection } from "@/lib/kb/types";

const sample: KbSection[] = [
  { key: "identidade", title: "Identidade e tom", editable: true, content: "Somos a Loja X." },
  { key: "regras_odoo", title: "Regras Odoo (movimentação do pipeline)", editable: false, content: "Novo → Em Contato." },
];

describe("composeKb", () => {
  it("emite headers numerados na ordem", () => {
    const md = composeKb(sample);
    expect(md).toContain("## 1. Identidade e tom");
    expect(md).toContain("## 2. Regras Odoo (movimentação do pipeline)");
    expect(md.indexOf("## 1.")).toBeLessThan(md.indexOf("## 2."));
  });
});

describe("mergeEditable", () => {
  it("aplica conteúdo só em bloco editável", () => {
    const out = mergeEditable(sample, { identidade: "Novo texto" });
    expect(out.find((s) => s.key === "identidade")!.content).toBe("Novo texto");
  });
  it("ignora tentativa de alterar bloco travado", () => {
    const out = mergeEditable(sample, { regras_odoo: "HACK" });
    expect(out.find((s) => s.key === "regras_odoo")!.content).toBe("Novo → Em Contato.");
  });
});

describe("initSections", () => {
  it("monta os 9 blocos do catálogo a partir do template", () => {
    const s = initSections("ingles", "");
    expect(s.length).toBe(9);
    expect(s.find((x) => x.key === "regras_odoo")!.content.length).toBeGreaterThan(0);
  });
  it("joga corpo legado na identidade quando há conteúdo antigo", () => {
    const s = initSections("outro", "Texto antigo do MEI");
    expect(s.find((x) => x.key === "identidade")!.content).toBe("Texto antigo do MEI");
  });
});

describe("kbByteLength", () => {
  it("conta bytes UTF-8", () => {
    expect(kbByteLength("ção")).toBe(5); // ç=2, ã=2, o=1
  });
});
