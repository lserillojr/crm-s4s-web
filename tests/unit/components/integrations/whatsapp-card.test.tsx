import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsAppCard } from "@/components/integrations/whatsapp-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

const baseData = {
  level: "ok" as const,
  waStatus: "connected",
  instanceName: "tenant-abc",
  lastInboundAt: new Date("2026-05-31T08:00:00Z"),
};

describe("WhatsAppCard", () => {
  it("renderiza Conectado quando level=ok", () => {
    render(<WhatsAppCard data={baseData} />);
    expect(screen.getAllByText(/Conectado/i).length).toBeGreaterThan(0);
  });

  it("renderiza Desconectado + botão Reparear quando level=error", () => {
    render(<WhatsAppCard data={{ ...baseData, level: "error", waStatus: "disconnected" }} />);
    expect(screen.getByText(/Desconectado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reparear/i })).toBeInTheDocument();
  });

  it("não exibe 'Evolution' nem 'Baileys' em lugar nenhum (UX MEI)", () => {
    render(<WhatsAppCard data={baseData} />);
    const visible = (document.body.textContent ?? "").toLowerCase();
    expect(visible).not.toContain("evolution");
    expect(visible).not.toContain("baileys");
  });

  it("botão Reparear abre o modal", async () => {
    const user = userEvent.setup();
    render(<WhatsAppCard data={{ ...baseData, level: "error", waStatus: "disconnected" }} />);
    await user.click(screen.getByRole("button", { name: /Reparear/i }));
    expect(screen.getByRole("dialog", { name: /Reparear WhatsApp/i })).toBeInTheDocument();
  });

  it("level=unconnected mostra link Conectar pra /wizard/whatsapp", () => {
    render(
      <WhatsAppCard
        data={{ ...baseData, level: "unconnected", instanceName: null, waStatus: null }}
      />
    );
    const link = screen.getByRole("link", { name: /Conectar/i });
    expect(link).toHaveAttribute("href", "/wizard/whatsapp");
  });
});
