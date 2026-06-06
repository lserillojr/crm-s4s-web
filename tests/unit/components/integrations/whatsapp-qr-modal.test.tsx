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

// Roteia QR vs status por URL. qrFactory(nthQrCall) define cada resposta de QR;
// statusWaStatus define o waStatus retornado pelo /api/integrations/status.
function routeFetch(opts: {
  qrFactory: (n: number) => { ok: boolean; status: number; body: unknown } | "throw";
  statusWaStatus: string;
}) {
  let qrCalls = 0;
  const counter = { get qrCalls() { return qrCalls; } };
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/whatsapp/qr") {
      qrCalls += 1;
      const r = opts.qrFactory(qrCalls);
      if (r === "throw") throw new Error("network blip");
      return { ok: r.ok, status: r.status, json: async () => r.body };
    }
    return {
      ok: true,
      json: async () => ({
        google: { level: "ok" },
        whatsapp: {
          level: opts.statusWaStatus === "connected" ? "ok" : "warn",
          waStatus: opts.statusWaStatus,
          instanceName: "abc",
          lastInboundAt: null,
        },
        instagram: { level: "unavailable" },
      }),
    };
  });
  return counter;
}

function okQr(n: number) {
  return { ok: true, status: 200, body: { qrcode: `data:image/png;base64,qr${n}`, pairingCode: `CODE-${n}`, expiresInSeconds: 60 } };
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

  it("auto-refresca o QR após 30s (antes da rotação de 45s)", async () => {
    routeFetch({ qrFactory: okQr, statusWaStatus: "disconnected" });
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,qr1")
    );
    await act(async () => { vi.advanceTimersByTime(30_000); });
    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,qr2")
    );
  });

  it("para de refrescar o QR quando o celular é detectado (scanning)", async () => {
    let qrCalls = 0;
    let waStatus = "disconnected";
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/whatsapp/qr") {
        qrCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            qrcode: `data:image/png;base64,qr${qrCalls}`,
            pairingCode: "X",
            expiresInSeconds: 60,
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          google: { level: "ok" },
          whatsapp: { level: "warn", waStatus, instanceName: "abc", lastInboundAt: null },
          instagram: { level: "unavailable" },
        }),
      };
    });
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,qr1")
    );
    // disconnected mantém ready → 1º refresh em 30s prova que o loop está ativo
    await act(async () => { vi.advanceTimersByTime(30_000); });
    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,qr2")
    );
    // agora o celular é detectado → modal entra em scanning e o refresh deve parar
    waStatus = "connecting";
    await act(async () => { vi.advanceTimersByTime(2_100); });
    await waitFor(() => expect(screen.getByText(/Detectamos seu celular/i)).toBeInTheDocument());
    const callsAfterScanning = qrCalls;
    // passa de outro intervalo de 30s — nenhum QR novo deve ser buscado
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(qrCalls).toBe(callsAfterScanning);
  });

  it("expira após 5 minutos sem parear (budget de sessão, não timer de QR individual)", async () => {
    routeFetch({ qrFactory: okQr, statusWaStatus: "disconnected" });
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    // O QR individual tem 60s, mas o auto-refresh mantém o modal ativo; só o budget de 5min expira
    // Antes de 5 minutos, o modal deve continuar mostrando QR (auto-refresh ativo)
    await act(async () => { vi.advanceTimersByTime(240_000); }); // 4 min
    expect(screen.queryByText(/QR expirou/i)).not.toBeInTheDocument();
    // prova que o auto-refresh seguiu disparando: o QR não é mais o inicial (qr1)
    expect(screen.getByRole("img")).not.toHaveAttribute("src", "data:image/png;base64,qr1");
    // Após 5 minutos, o budget expira
    await act(async () => { vi.advanceTimersByTime(60_000); }); // +1 min = 5 min total
    await waitFor(() => expect(screen.getByText(/QR expirou/i)).toBeInTheDocument());
  });

  it("'Gerar novo' re-arma o auto-refresh", async () => {
    const c = routeFetch({ qrFactory: okQr, statusWaStatus: "disconnected" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    await act(async () => { vi.advanceTimersByTime(300_000); });
    await waitFor(() => expect(screen.getByText(/QR expirou/i)).toBeInTheDocument());
    const before = c.qrCalls;
    await user.click(screen.getByRole("button", { name: /Gerar novo/i }));
    await waitFor(() => expect(c.qrCalls).toBe(before + 1));
    await act(async () => { vi.advanceTimersByTime(30_000); });
    await waitFor(() => expect(c.qrCalls).toBe(before + 2));
  });

  it("falha transitória num refresh mantém o último QR (não vira erro)", async () => {
    const c = routeFetch({
      qrFactory: (n) => (n === 2 ? "throw" : okQr(n)),
      statusWaStatus: "disconnected",
    });
    render(<WhatsAppQrModal open onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,qr1")
    );
    // Avança 30s: o auto-refresh DEVE ter tentado buscar o QR (call 2 → throw)
    await act(async () => { vi.advanceTimersByTime(30_000); });
    // A tentativa de refresh foi feita (qrCalls = 2) mas falhou — o QR anterior fica visível
    await waitFor(() => expect(c.qrCalls).toBeGreaterThanOrEqual(2));
    expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,qr1");
    expect(screen.queryByText(/Demorou demais|Algo deu errado/i)).not.toBeInTheDocument();
  });
});
