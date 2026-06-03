import { describe, it, expect } from "vitest";
import { slugify, tenantSlug, buildProvisionPayload } from "@/lib/onboarding/contract";
import { wizardDefaults } from "@/lib/wizard/schemas";

describe("slugify", () => {
  it("normaliza acentos, espaços e símbolos pra ^[a-z0-9-]+$", () => {
    expect(slugify("Salão Maria")).toBe("salao-maria");
    expect(slugify("  Café  &  Cia!! ")).toBe("cafe-cia");
    expect(slugify("Açaí 100% Natural")).toBe("acai-100-natural");
  });

  it("fallback determinístico quando vazia após normalizar", () => {
    const out = slugify("!!!");
    expect(out).toMatch(/^mei-[a-z0-9]{6}$/);
  });
});

describe("tenantSlug", () => {
  it("anexa um sufixo derivado da idempotency_key (slug único)", () => {
    // base do nome + 6 hex da chave → dois MEIs com o mesmo nome NÃO colidem.
    expect(tenantSlug("Salão Maria", "a2b74f6a-a78e-4229-9e50-5a0f8e5052a0")).toBe(
      "salao-maria-a2b74f",
    );
  });

  it("é determinístico pra mesma chave (idempotência) e único entre chaves", () => {
    const k1 = "11111111-1111-4111-8111-111111111111";
    const k2 = "22222222-2222-4222-8222-222222222222";
    expect(tenantSlug("Escola X", k1)).toBe(tenantSlug("Escola X", k1));
    expect(tenantSlug("Escola X", k1)).not.toBe(tenantSlug("Escola X", k2));
  });

  it("nome vazio cai no fallback mei-* + sufixo", () => {
    expect(tenantSlug("!!!", "abcdef00-1111-4111-8111-111111111111")).toMatch(
      /^mei-[a-z0-9]{6}-abcdef$/,
    );
  });
});

describe("buildProvisionPayload", () => {
  const base = {
    wizard: {
      ...wizardDefaults,
      whatsapp: { phoneNumber: "(11) 98888-7777", provider: "evolution" as const, hasExistingNumber: true },
      instagram: { connect: true, instagramHandle: "@salao" },
      calendar: { connect: true, timezone: "America/Sao_Paulo" as const },
      kb: { businessName: "Salão Maria", vertical: "beleza", about: "Salão de beleza no centro com cortes e escova." },
      confirm: { acceptTerms: true },
    },
    user: { email: "maria@teste.dev", name: "Maria Silva" },
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    magicLinkRedirectUrl: "https://app.example.com/dashboard",
  };

  it("mapeia o wizard pro contrato (campos âncora)", () => {
    const p = buildProvisionPayload(base);
    expect(p.idempotency_key).toBe(base.idempotencyKey);
    expect(p.user).toEqual({ email: "maria@teste.dev", name: "Maria Silva", password_hash: null, sub: "" });
    expect(p.tenant.slug).toBe("salao-maria-111111");
    expect(p.tenant.vertical).toBe("beleza");
    expect(p.tenant.company_name).toBe("Salão Maria");
    expect(p.tenant.wa_provider).toBe("evolution");
    expect(p.tenant.wa_phone_display).toBe("11988887777");
    expect(p.tenant.ai_kb_overrides).toEqual({
      business_name: "Salão Maria",
      about: "Salão de beleza no centro com cortes e escova.",
    });
    expect(p.wizard_state.step_completed).toBe("5_review");
    expect(p.wizard_state.metadata).toMatchObject({
      instagram_connect: true,
      instagram_handle: "@salao",
      calendar_connect: true,
      calendar_timezone: "America/Sao_Paulo",
      has_existing_number: true,
    });
    expect(p.callback_preferences).toEqual({
      magic_link_redirect_url: "https://app.example.com/dashboard",
      email_locale: "pt-BR",
    });
  });

  it("name nulo vira string vazia; campos opcionais nulos", () => {
    const p = buildProvisionPayload({ ...base, user: { email: "x@y.dev", name: null } });
    expect(p.user.name).toBe("");
    expect(p.tenant.wa_phone_id).toBeNull();
    expect(p.tenant.instagram_account_id).toBeNull();
    expect(p.tenant.google_calendar_refresh_token).toBeNull();
  });

  it("propaga o sub do Keycloak no user", () => {
    const p = buildProvisionPayload({ ...base, user: { email: "x@y.dev", name: "X", sub: "kc-sub-123" } });
    expect(p.user.sub).toBe("kc-sub-123");
  });

  it("sub ausente vira string vazia (Worker faz soft-fail)", () => {
    const p = buildProvisionPayload({ ...base, user: { email: "x@y.dev", name: "X" } });
    expect(p.user.sub).toBe("");
  });
});
