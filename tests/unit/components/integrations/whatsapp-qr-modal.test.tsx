import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsAppQrModal } from "@/components/integrations/whatsapp-qr-modal";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function mockQrSuccess() {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      qrcode: "data:image/png;base64,abc",
      pairingCode: "ABCD-1234",
      expiresInSeconds: 60,
    }),
  });
}

function mockStatusOnce(waStatus: string) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      google: { level: "ok" },
      whatsapp: {
        level: waStatus === "connected" ? "ok" : "warn",
        waStatus,
        instanceName: "abc",
        lastInboundAt: new Date().toISOString(),
      },
      instagram: { level: "unavailable" },
    }),
  });
}

describe("WhatsAppQrModal", () => {
  it("mostra spinner enquanto carrega QR", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<WhatsAppQrModal open onClose={() => {}} />);
    expect(screen.getByText(/Gerando QR/i)).toBeInTheDocument();
  });

  it("renderiza QR base64 e pairing code quando carrega", async () => {
    mockQrSuccess();
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    expect(screen.getByText("ABCD-1234")).toBeInTheDocument();
  });

  it("polling detecta waStatus=connected dispara onConnected + onClose", async () => {
    mockQrSuccess();
    mockStatusOnce("connecting");
    mockStatusOnce("connected");
    const onClose = vi.fn();
    const onConnected = vi.fn();
    render(<WhatsAppQrModal open onClose={onClose} onConnected={onConnected} />);
    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    await waitFor(() => expect(onConnected).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("503 evolution_unreachable mostra mensagem amigável", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "evolution_unreachable" }),
    });
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText(/servidor do WhatsApp/i)).toBeInTheDocument()
    );
  });

  it("botão Cancelar chama onClose sem efeito colateral", async () => {
    mockQrSuccess();
    const onClose = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<WhatsAppQrModal open onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
