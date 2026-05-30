import { describe, it, expect, vi, beforeEach } from "vitest";

const executeMock = vi.fn();
vi.mock("@/lib/db", () => ({ db: { execute: (q: unknown) => executeMock(q) } }));

import { getOnboardingState, saveOnboardingState } from "@/lib/onboarding/server-state";

describe("server-state", () => {
  beforeEach(() => executeMock.mockReset());

  it("getOnboardingState devolve o jsonb da row", async () => {
    executeMock.mockResolvedValue([{ onboarding_state: { furthestCompletedStep: "kb", auditId: "a1" } }]);
    const out = await getOnboardingState("Maria@Teste.dev");
    expect(out).toEqual({ furthestCompletedStep: "kb", auditId: "a1" });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("getOnboardingState devolve null quando sem row ou coluna nula", async () => {
    executeMock.mockResolvedValueOnce([]);
    expect(await getOnboardingState("x@y.dev")).toBeNull();
    executeMock.mockResolvedValueOnce([{ onboarding_state: null }]);
    expect(await getOnboardingState("x@y.dev")).toBeNull();
  });

  it("getOnboardingState retorna null sem email (não consulta)", async () => {
    expect(await getOnboardingState("")).toBeNull();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("saveOnboardingState faz merge (UPDATE) e devolve o estado mesclado", async () => {
    executeMock
      .mockResolvedValueOnce([{ onboarding_state: { furthestCompletedStep: "kb" } }]) // SELECT atual
      .mockResolvedValueOnce([{ id: "u1" }]); // UPDATE ... RETURNING id
    const out = await saveOnboardingState("maria@teste.dev", { auditId: "a1", lastStatus: "in_progress" });
    expect(out).toMatchObject({ furthestCompletedStep: "kb", auditId: "a1", lastStatus: "in_progress" });
    expect(out.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(executeMock).toHaveBeenCalledTimes(2);
  });

  it("saveOnboardingState lança quando o user não existe (UPDATE 0 rows)", async () => {
    executeMock
      .mockResolvedValueOnce([]) // SELECT atual (sem row)
      .mockResolvedValueOnce([]); // UPDATE ... RETURNING id (0 rows)
    await expect(saveOnboardingState("ghost@teste.dev", { auditId: "a1" })).rejects.toThrow(/não encontrado/i);
  });

  it("saveOnboardingState lança sem email", async () => {
    await expect(saveOnboardingState("", { auditId: "a1" })).rejects.toThrow(/email/i);
  });
});
