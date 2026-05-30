// tests/unit/sso-launchers.test.tsx
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(() => cleanup());

import { SsoLaunchers } from "@/components/sso/sso-launchers";

const both = {
  chatwoot: "https://dev-chat.example.com/sso/openid_connect/start",
  odoo: "https://dev-backoffice.example.com/web/login",
};

describe("SsoLaunchers", () => {
  it("card: renderiza os 2 links com href, target e rel corretos", () => {
    render(<SsoLaunchers targets={both} variant="card" />);
    const chat = screen.getByRole("link", { name: /Abrir meu atendimento/i });
    const odoo = screen.getByRole("link", { name: /Abrir meu backoffice/i });
    expect(chat).toHaveAttribute("href", both.chatwoot);
    expect(odoo).toHaveAttribute("href", both.odoo);
    expect(chat).toHaveAttribute("target", "_blank");
    expect(chat).toHaveAttribute("rel", "noopener noreferrer");
    expect(odoo).toHaveAttribute("target", "_blank");
    expect(odoo).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("card: env var ausente vira botao desabilitado (sem link)", () => {
    render(<SsoLaunchers targets={{ chatwoot: null, odoo: both.odoo }} variant="card" />);
    expect(screen.queryByRole("link", { name: /Abrir meu atendimento/i })).toBeNull();
    const disabled = screen.getByRole("button", { name: /Abrir meu atendimento/i });
    expect(disabled).toBeDisabled();
    // o que existe continua sendo link
    expect(screen.getByRole("link", { name: /Abrir meu backoffice/i })).toHaveAttribute("href", both.odoo);
  });

  it("nav: omite o atalho ausente", () => {
    render(<SsoLaunchers targets={{ chatwoot: null, odoo: both.odoo }} variant="nav" />);
    expect(screen.queryByText(/Abrir meu atendimento/i)).toBeNull();
    expect(screen.getByRole("link", { name: /Abrir meu backoffice/i })).toHaveAttribute("href", both.odoo);
  });
});
