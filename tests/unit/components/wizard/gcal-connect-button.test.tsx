import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GcalConnectButton } from "@/components/wizard/gcal-connect-button";

afterEach(() => {
  cleanup();
});

describe("<GcalConnectButton />", () => {
  it("estado idle: botão 'Conectar Google Calendar' + 'Conectar depois'", () => {
    render(<GcalConnectButton state="idle" onSkip={() => {}} />);
    expect(screen.getByRole("link", { name: /conectar google calendar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /conectar depois/i })).toBeInTheDocument();
  });

  it("estado loading: mostra spinner text", () => {
    render(<GcalConnectButton state="loading" onSkip={() => {}} />);
    expect(screen.getByText(/aguardando.*google/i)).toBeInTheDocument();
  });

  it("estado connected: mostra nome do calendar", () => {
    render(<GcalConnectButton state="connected" calendarName="Maria — primary" onSkip={() => {}} />);
    expect(screen.getByText(/conectado/i)).toBeInTheDocument();
    expect(screen.getByText(/maria/i)).toBeInTheDocument();
  });

  it("estado error: mostra mensagem mapeada", () => {
    render(<GcalConnectButton state="error" errorCode="invalid_state" onSkip={() => {}} />);
    expect(screen.getByText(/sessão|estado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tentar de novo/i })).toBeInTheDocument();
  });

  it("estado skipped: mostra disclaimer + botão 'Conectar agora'", () => {
    render(<GcalConnectButton state="skipped" onSkip={() => {}} />);
    expect(screen.getByText(/atendente confirma/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conectar agora/i })).toBeInTheDocument();
  });

  it("clicar 'Conectar depois' chama onSkip", () => {
    const onSkip = vi.fn();
    render(<GcalConnectButton state="idle" onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: /conectar depois/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
