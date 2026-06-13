import { describe, it, expect } from "vitest";
import {
  funilGetResponseSchema,
  renamePayloadSchema,
} from "@/lib/funil/schema";

describe("funilGetResponseSchema", () => {
  it("aceita a lista de etapas do WF", () => {
    const parsed = funilGetResponseSchema.safeParse({
      stages: [
        { s4s_role: "novo", name: "Novo", sequence: 10, is_won: false },
        { s4s_role: "venda", name: "Matriculado", sequence: 60, is_won: true },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("default de stages vazio quando ausente", () => {
    const parsed = funilGetResponseSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.stages).toEqual([]);
  });
});

describe("renamePayloadSchema", () => {
  it("aceita renames válidos", () => {
    const parsed = renamePayloadSchema.safeParse({
      renames: [{ role: "orcamento", name: "Proposta" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const parsed = renamePayloadSchema.safeParse({
      renames: [{ role: "orcamento", name: "   " }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita nome > 64 chars", () => {
    const parsed = renamePayloadSchema.safeParse({
      renames: [{ role: "orcamento", name: "x".repeat(65) }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita lista vazia", () => {
    const parsed = renamePayloadSchema.safeParse({ renames: [] });
    expect(parsed.success).toBe(false);
  });
});
