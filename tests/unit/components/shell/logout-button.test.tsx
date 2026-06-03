import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LogoutButton } from "@/components/shell/logout-button";

afterEach(() => cleanup());

describe("LogoutButton", () => {
  it("injeta um iframe de logout por embed e depois chama o logout federado", async () => {
    const onFederatedLogout = vi.fn();
    render(
      <LogoutButton
        targets={{
          odoo: "https://dev-backoffice.x/web/session/logout?redirect=/web/login",
          chatwoot: "https://dev-chat.x/app/login",
        }}
        onFederatedLogout={onFederatedLogout}
      />,
    );

    fireEvent.click(screen.getByTestId("logout"));

    await waitFor(() => {
      const iframes = document.querySelectorAll("iframe[data-embed-logout]");
      expect(iframes.length).toBe(2);
    });

    // jsdom não dispara onload de iframe; o timeout de segurança garante a chamada.
    await waitFor(() => expect(onFederatedLogout).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
  });

  it("sem alvos, chama o logout federado direto (sem iframes)", async () => {
    const onFederatedLogout = vi.fn();
    render(
      <LogoutButton
        targets={{ odoo: null, chatwoot: null }}
        onFederatedLogout={onFederatedLogout}
      />,
    );

    fireEvent.click(screen.getByTestId("logout"));

    expect(document.querySelectorAll("iframe[data-embed-logout]").length).toBe(0);
    await waitFor(() => expect(onFederatedLogout).toHaveBeenCalledTimes(1));
  });
});
