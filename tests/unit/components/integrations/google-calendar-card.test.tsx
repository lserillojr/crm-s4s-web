import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GoogleCalendarCard } from "@/components/integrations/google-calendar-card";

afterEach(() => {
  cleanup();
});

const baseData = {
  level: "ok" as const,
  calendarId: "primary",
  revokedAt: null,
  lastUsedAt: new Date("2026-05-31T08:00:00Z"),
};

describe("GoogleCalendarCard", () => {
  it("renderiza Conectado quando level=ok", () => {
    render(<GoogleCalendarCard data={baseData} />);
    expect(screen.getAllByText(/Conectado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/primary/)).toBeInTheDocument();
  });

  it("renderiza Acesso revogado quando level=error com botão primário", () => {
    render(<GoogleCalendarCard data={{ ...baseData, level: "error", revokedAt: new Date() }} />);
    expect(screen.getByText(/Acesso revogado/i)).toBeInTheDocument();
    const button = screen.getByRole("link", { name: /Reconectar/i });
    expect(button).toHaveAttribute("href", "/api/oauth/google/start?returnTo=/settings/integracoes");
  });

  it("renderiza Sem uso recente quando level=warn", () => {
    render(<GoogleCalendarCard data={{ ...baseData, level: "warn", lastUsedAt: null }} />);
    expect(screen.getByText(/Sem uso recente/i)).toBeInTheDocument();
  });

  it("renderiza Não conectado + botão Conectar quando level=unconnected", () => {
    render(<GoogleCalendarCard data={{ ...baseData, level: "unconnected", calendarId: null }} />);
    // "Não conectado" aparece 2x: na StatusPill (DEFAULT_LABEL) + no <p> do card
    expect(screen.getAllByText(/Não conectado/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Conectar/i })).toBeInTheDocument();
  });

  it("não menciona jargão técnico ('Google API'/'invalid_grant'/'OAuth') no texto visível pra MEI", () => {
    render(<GoogleCalendarCard data={baseData} />);
    // Pega só os textos visíveis (não atributos como href que contém /api/oauth/google/start)
    const visibleText = (document.body.textContent ?? "").toLowerCase();
    expect(visibleText).not.toContain("google api");
    expect(visibleText).not.toContain("invalid_grant");
    expect(visibleText).not.toContain("oauth");
    expect(visibleText).not.toContain("refresh token");
  });
});
