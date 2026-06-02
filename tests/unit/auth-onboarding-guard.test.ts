import { describe, it, expect } from "vitest";
import { needsOnboarding } from "@/lib/auth/onboarding-guard";

describe("needsOnboarding", () => {
  it("NÃO redireciona quando a sessão já tem tenantId (caminho feliz, sem hit no banco)", () => {
    expect(
      needsOnboarding({
        sessionTenantId: "11111111-1111-1111-1111-111111111111",
        dbTenantId: null,
      }),
    ).toBe(false);
  });

  it("NÃO redireciona quando o token está defasado mas o banco já tem tenantId (recém-provisionado)", () => {
    // JWT cunhado no login, antes do claim existir → sessão sem tenant, mas o
    // provisionamento já gravou tenant_id no banco. Não pode voltar ao wizard.
    expect(
      needsOnboarding({
        sessionTenantId: null,
        dbTenantId: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe(false);
  });

  it("redireciona quando NENHUMA fonte tem tenant (cadastro nunca finalizado — bug do teste@teste)", () => {
    expect(
      needsOnboarding({ sessionTenantId: null, dbTenantId: null }),
    ).toBe(true);
  });

  it("trata undefined como ausência de tenant", () => {
    expect(
      needsOnboarding({ sessionTenantId: undefined, dbTenantId: undefined }),
    ).toBe(true);
  });

  it("trata string vazia como ausência de tenant", () => {
    expect(needsOnboarding({ sessionTenantId: "", dbTenantId: "" })).toBe(true);
    // mas se o banco tem valor real, string vazia no token não força redirect
    expect(
      needsOnboarding({ sessionTenantId: "", dbTenantId: "abc" }),
    ).toBe(false);
  });
});
