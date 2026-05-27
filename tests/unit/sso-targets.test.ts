// tests/unit/sso-targets.test.ts
import { afterEach, describe, it, expect, vi } from "vitest";
import { chatwootSsoUrl, odooSsoUrl, getSsoTargets } from "@/lib/sso-targets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sso-targets", () => {
  it("chatwootSsoUrl monta a rota de iniciacao same-origin", () => {
    expect(chatwootSsoUrl("https://dev-chat.example.com")).toBe(
      "https://dev-chat.example.com/sso/openid_connect/start",
    );
  });

  it("odooSsoUrl aponta pra login page (botao nativo)", () => {
    expect(odooSsoUrl("https://dev-backoffice.example.com")).toBe(
      "https://dev-backoffice.example.com/web/login",
    );
  });

  it("apara barra final do base url", () => {
    expect(chatwootSsoUrl("https://x.com/")).toBe("https://x.com/sso/openid_connect/start");
    expect(odooSsoUrl("https://x.com//")).toBe("https://x.com/web/login");
  });

  it("getSsoTargets monta as 2 URLs quando as env vars existem", () => {
    vi.stubEnv("NEXT_PUBLIC_CHATWOOT_URL", "https://dev-chat.example.com");
    vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "https://dev-backoffice.example.com");
    expect(getSsoTargets()).toEqual({
      chatwoot: "https://dev-chat.example.com/sso/openid_connect/start",
      odoo: "https://dev-backoffice.example.com/web/login",
    });
  });

  it("getSsoTargets devolve null para env var ausente ou vazia", () => {
    vi.stubEnv("NEXT_PUBLIC_CHATWOOT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "https://dev-backoffice.example.com");
    expect(getSsoTargets()).toEqual({
      chatwoot: null,
      odoo: "https://dev-backoffice.example.com/web/login",
    });
  });
});
