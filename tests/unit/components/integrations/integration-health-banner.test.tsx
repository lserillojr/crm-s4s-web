import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { IntegrationHealthBanner } from "@/components/integrations/integration-health-banner";
import type { IntegrationHealth } from "@/lib/integrations/get-integration-health";

afterEach(() => {
  cleanup();
});

function fakeHealth(opts: { gErr?: boolean; waErr?: boolean }): IntegrationHealth {
  return {
    google: {
      level: opts.gErr ? "error" : "ok",
      calendarId: "primary",
      revokedAt: opts.gErr ? new Date() : null,
      lastUsedAt: new Date(),
    },
    whatsapp: {
      level: opts.waErr ? "error" : "ok",
      waStatus: opts.waErr ? "disconnected" : "connected",
      instanceName: "abc",
      lastInboundAt: new Date(),
    },
    instagram: { level: "unavailable" },
  };
}

describe("IntegrationHealthBanner", () => {
  it("retorna null quando nada está em erro", () => {
    const { container } = render(<IntegrationHealthBanner health={fakeHealth({})} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza singular quando só Google em erro", () => {
    render(<IntegrationHealthBanner health={fakeHealth({ gErr: true })} />);
    expect(screen.getByText(/agenda Google está desconectada/i)).toBeInTheDocument();
  });

  it("renderiza singular quando só WhatsApp em erro", () => {
    render(<IntegrationHealthBanner health={fakeHealth({ waErr: true })} />);
    expect(screen.getByText(/WhatsApp está desconectado/i)).toBeInTheDocument();
  });

  it("renderiza '2 integrações' quando ambos em erro", () => {
    render(<IntegrationHealthBanner health={fakeHealth({ gErr: true, waErr: true })} />);
    expect(screen.getByText(/2 integrações/i)).toBeInTheDocument();
  });

  it("link 'Resolver agora' aponta pra /settings/integracoes", () => {
    render(<IntegrationHealthBanner health={fakeHealth({ gErr: true })} />);
    const link = screen.getByRole("link", { name: /Resolver/i });
    expect(link).toHaveAttribute("href", "/settings/integracoes");
  });

  it("data-testid presente quando renderiza", () => {
    render(<IntegrationHealthBanner health={fakeHealth({ gErr: true })} />);
    expect(screen.getByTestId("integration-health-banner")).toBeInTheDocument();
  });
});
