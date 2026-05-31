import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("@/lib/sso-targets", () => ({
  getSsoTargets: () => ({
    chatwoot: "https://chat.example.com/sso/openid_connect/start",
    odoo: "https://odoo.example.com/web/login",
  }),
}));

import { PrewarmSso } from "@/components/shell/prewarm-sso";

beforeEach(() => sessionStorage.clear());
afterEach(() => cleanup());

describe("PrewarmSso", () => {
  it("monta os iframes de pré-aquecimento no 1º load", async () => {
    render(<PrewarmSso />);
    await waitFor(() =>
      expect(screen.getByTestId("sso-prewarm")).toBeInTheDocument(),
    );
    expect(screen.getByTitle("prewarm-chatwoot")).toBeInTheDocument();
    expect(screen.getByTitle("prewarm-odoo")).toBeInTheDocument();
  });

  it("não pré-aquece de novo se já aqueceu nesta sessão", () => {
    sessionStorage.setItem("s4s_sso_warm", "1");
    render(<PrewarmSso />);
    expect(screen.queryByTestId("sso-prewarm")).not.toBeInTheDocument();
  });
});
