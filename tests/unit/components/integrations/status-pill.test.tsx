import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusPill } from "@/components/integrations/status-pill";

afterEach(() => {
  cleanup();
});

describe("StatusPill", () => {
  it("renderiza Conectado quando level=ok", () => {
    render(<StatusPill level="ok" />);
    expect(screen.getByText(/Conectado/i)).toBeInTheDocument();
    expect(screen.getByText("✅")).toBeInTheDocument();
  });

  it("renderiza warn icon quando level=warn", () => {
    render(<StatusPill level="warn" />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("renderiza error icon quando level=error", () => {
    render(<StatusPill level="error" />);
    expect(screen.getByText("❌")).toBeInTheDocument();
  });

  it("renderiza unconnected icon quando level=unconnected", () => {
    render(<StatusPill level="unconnected" />);
    expect(screen.getByText("➖")).toBeInTheDocument();
  });

  it("renderiza unavailable icon quando level=unavailable", () => {
    render(<StatusPill level="unavailable" />);
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("aceita label customizada via prop", () => {
    render(<StatusPill level="ok" label="Funcionando bem" />);
    expect(screen.getByText("Funcionando bem")).toBeInTheDocument();
  });

  it("expõe data-testid baseado no level pra E2E", () => {
    render(<StatusPill level="warn" />);
    expect(screen.getByTestId("status-pill-warn")).toBeInTheDocument();
  });
});
