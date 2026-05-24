import { describe, it, expect, vi, beforeEach } from "vitest";

const executeMock = vi.fn();
vi.mock("@/lib/db", () => ({ db: { execute: (q: unknown) => executeMock(q) } }));

import { userFieldsFromProfile } from "@/lib/auth/upsert-user";

describe("userFieldsFromProfile (puro)", () => {
  it("extrai email/name/phone_number do profile OIDC", () => {
    const out = userFieldsFromProfile({
      email: "Maria@Teste.dev",
      name: "Maria",
      phone_number: "+5511999999999",
    });
    expect(out).toEqual({
      email: "Maria@Teste.dev",
      name: "Maria",
      phoneNumber: "+5511999999999",
    });
  });

  it("name cai pra preferred_username quando name ausente", () => {
    const out = userFieldsFromProfile({
      email: "m@t.dev",
      preferred_username: "maria_mei",
    });
    expect(out?.name).toBe("maria_mei");
  });

  it("phone ausente vira null; name ausente vira null", () => {
    const out = userFieldsFromProfile({ email: "m@t.dev" });
    expect(out?.phoneNumber).toBeNull();
    expect(out?.name).toBeNull();
  });

  it("sem email retorna null (não dá pra sincronizar)", () => {
    expect(userFieldsFromProfile({ name: "Sem Email" })).toBeNull();
    expect(userFieldsFromProfile(undefined)).toBeNull();
    expect(userFieldsFromProfile({ email: "" })).toBeNull();
  });
});

describe("upsertKeycloakUser (efeito no DB)", () => {
  beforeEach(() => executeMock.mockReset());

  it("executa o upsert quando há email", async () => {
    executeMock.mockResolvedValue(undefined);
    const { upsertKeycloakUser } = await import("@/lib/auth/upsert-user");
    await upsertKeycloakUser({ email: "maria@teste.dev", name: "Maria" });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("lança (fail-closed) e não toca o DB quando falta email", async () => {
    const { upsertKeycloakUser } = await import("@/lib/auth/upsert-user");
    await expect(upsertKeycloakUser({ name: "Sem Email" })).rejects.toThrow(
      /email/i,
    );
    expect(executeMock).not.toHaveBeenCalled();
  });
});
