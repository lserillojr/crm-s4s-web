import { describe, it, expect } from "vitest";
import {
  odooLogoutUrl,
  chatwootLogoutUrl,
  getEmbedLogoutTargets,
} from "@/lib/auth/embed-logout-targets";

describe("embed-logout-targets", () => {
  it("monta logout do Odoo", () => {
    expect(odooLogoutUrl("https://dev-backoffice.x.com/")).toBe(
      "https://dev-backoffice.x.com/web/session/logout?redirect=/web/login",
    );
  });

  it("monta logout do Chatwoot", () => {
    expect(chatwootLogoutUrl("https://dev-chat.x.com")).toBe(
      "https://dev-chat.x.com/app/login",
    );
  });

  it("getEmbedLogoutTargets resolve as duas bases válidas", () => {
    const t = getEmbedLogoutTargets({
      odoo: "https://dev-backoffice.x.com",
      chatwoot: "https://dev-chat.x.com",
    });
    expect(t.odoo).toBe(
      "https://dev-backoffice.x.com/web/session/logout?redirect=/web/login",
    );
    expect(t.chatwoot).toBe("https://dev-chat.x.com/app/login");
  });

  it("retorna null quando a base é inválida/ausente", () => {
    const t = getEmbedLogoutTargets({ odoo: undefined, chatwoot: "" });
    expect(t.odoo).toBeNull();
    expect(t.chatwoot).toBeNull();
  });

  it("ignora base não-http", () => {
    const t = getEmbedLogoutTargets({ odoo: "ftp://x", chatwoot: "not-a-url" });
    expect(t.odoo).toBeNull();
    expect(t.chatwoot).toBeNull();
  });
});
