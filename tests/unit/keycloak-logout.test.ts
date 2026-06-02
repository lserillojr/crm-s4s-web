import { describe, it, expect } from "vitest";
import { buildKeycloakLogoutUrl } from "@/lib/auth/keycloak-logout";

const ISSUER = "https://dev-auth.staff4solutions.com.br/realms/s4s";

describe("buildKeycloakLogoutUrl", () => {
  it("monta o end_session com client_id e post_logout_redirect_uri=/login", () => {
    const url = buildKeycloakLogoutUrl({
      issuer: ISSUER,
      clientId: "web-simples",
      appBaseUrl: "https://dev-app.staff4solutions.com.br",
    });
    const u = new URL(url!);
    expect(u.origin + u.pathname).toBe(
      "https://dev-auth.staff4solutions.com.br/realms/s4s/protocol/openid-connect/logout",
    );
    expect(u.searchParams.get("client_id")).toBe("web-simples");
    expect(u.searchParams.get("post_logout_redirect_uri")).toBe(
      "https://dev-app.staff4solutions.com.br/login",
    );
  });

  it("normaliza barras finais (issuer e appBaseUrl) — casa o uri registrado", () => {
    const url = buildKeycloakLogoutUrl({
      issuer: ISSUER + "/",
      clientId: "web-simples",
      appBaseUrl: "https://dev-app.staff4solutions.com.br/",
    });
    const u = new URL(url!);
    expect(u.pathname.endsWith("/protocol/openid-connect/logout")).toBe(true);
    expect(u.searchParams.get("post_logout_redirect_uri")).toBe(
      "https://dev-app.staff4solutions.com.br/login",
    );
  });

  it("sem issuer ou clientId → null (cai pro signOut local)", () => {
    expect(
      buildKeycloakLogoutUrl({ issuer: undefined, clientId: "x", appBaseUrl: "https://a" }),
    ).toBeNull();
    expect(
      buildKeycloakLogoutUrl({ issuer: ISSUER, clientId: undefined, appBaseUrl: "https://a" }),
    ).toBeNull();
  });
});
