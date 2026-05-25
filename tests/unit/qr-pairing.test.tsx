import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QrPairing } from "@/components/onboarding/qr-pairing";

afterEach(() => {
  cleanup();
});

describe("QrPairing", () => {
  it("renderiza o QR como <img> quando qrCodeUrl é data-url", () => {
    render(<QrPairing qrCodeUrl="data:image/png;base64,AAAA" onRefresh={vi.fn()} refreshing={false} />);
    const img = screen.getByAltText(/QR Code/i) as HTMLImageElement;
    expect(img.src).toContain("data:image/png;base64,AAAA");
  });

  it("mostra as instruções de pareamento (Aparelhos conectados)", () => {
    render(<QrPairing qrCodeUrl="data:image/png;base64,AAAA" onRefresh={vi.fn()} refreshing={false} />);
    expect(screen.getByText(/Aparelhos conectados/i)).toBeInTheDocument();
  });

  it("estado de espera quando ainda não há QR", () => {
    render(<QrPairing qrCodeUrl={null} onRefresh={vi.fn()} refreshing={false} />);
    expect(screen.getByText(/Gerando seu QR Code/i)).toBeInTheDocument();
  });

  it("botão atualizar chama onRefresh", async () => {
    const onRefresh = vi.fn();
    render(<QrPairing qrCodeUrl="data:image/png;base64,AAAA" onRefresh={onRefresh} refreshing={false} />);
    await userEvent.click(screen.getByRole("button", { name: /Atualizar QR/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
