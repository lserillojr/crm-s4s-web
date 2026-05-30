"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ModalState =
  | { kind: "loading" }
  | { kind: "ready"; qrcode: string; pairingCode: string }
  | { kind: "expired" }
  | { kind: "scanning" }
  | { kind: "connected" }
  | { kind: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  evolution_unreachable: "Não conseguimos falar com o servidor do WhatsApp agora. Tente em 1 minuto.",
  instance_missing: "Sua instância foi removida. Entre em contato com o suporte.",
  no_instance_provisioned: "Sua conta ainda não tem WhatsApp configurado.",
  unauth: "Sua sessão expirou. Faça login de novo.",
};

const QR_EXPIRES_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;
const POLL_FAILURE_THRESHOLD = 3;
const SUCCESS_CLOSE_DELAY_MS = 1_500;

export function WhatsAppQrModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}) {
  const [state, setState] = useState<ModalState>({ kind: "loading" });
  const [pollFailCount, setPollFailCount] = useState(0);
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setState({ kind: "loading" });
    setPollFailCount(0);
    let cancelled = false;
    fetch("/api/whatsapp/qr")
      .then(async (resp) => {
        const body = await resp.json();
        if (cancelled) return;
        if (!resp.ok) {
          setState({ kind: "error", message: ERROR_MESSAGES[body.error] ?? "Algo deu errado." });
          return;
        }
        setState({ kind: "ready", qrcode: body.qrcode, pairingCode: body.pairingCode });
        if (expireTimer.current) clearTimeout(expireTimer.current);
        expireTimer.current = setTimeout(() => {
          setState((s) => (s.kind === "ready" ? { kind: "expired" } : s));
        }, QR_EXPIRES_MS);
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: "error", message: "Demorou demais. Tente de novo." });
      });
    return () => {
      cancelled = true;
      if (expireTimer.current) clearTimeout(expireTimer.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (state.kind !== "ready" && state.kind !== "scanning") return;
    const id = setInterval(async () => {
      try {
        const resp = await fetch("/api/integrations/status");
        if (!resp.ok) throw new Error(`status ${resp.status}`);
        const data = await resp.json();
        const wa = data.whatsapp;
        setPollFailCount(0);
        if (wa.waStatus === "connected" || wa.waStatus === "open") {
          setState({ kind: "connected" });
          setTimeout(() => {
            onConnected?.();
            onClose();
          }, SUCCESS_CLOSE_DELAY_MS);
        } else if (["connecting", "awaiting_qr_scan", "pending", "qr_pending"].includes(wa.waStatus)) {
          setState((s) => (s.kind === "ready" ? { kind: "scanning" } : s));
        }
      } catch {
        setPollFailCount((c) => c + 1);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [open, state.kind, onClose, onConnected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-label="Reparear WhatsApp"
      >
        <h2 className="mb-4 text-lg font-semibold">Reparear WhatsApp</h2>

        {state.kind === "loading" && <p>Gerando QR code…</p>}

        {state.kind === "ready" && (
          <div className="space-y-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- data:image/png;base64 não se beneficia de next/image */}
            <img src={state.qrcode} alt="QR code WhatsApp" className="mx-auto h-64 w-64" />
            <p className="font-mono text-lg">{state.pairingCode}</p>
            <p className="text-xs text-muted-foreground">
              Abra o WhatsApp no seu celular → Aparelhos conectados → Conectar aparelho.
            </p>
          </div>
        )}

        {state.kind === "scanning" && (
          <p className="text-sm">Detectamos seu celular! Aguardando finalização…</p>
        )}

        {state.kind === "expired" && (
          <div className="space-y-3 text-center">
            <p>QR expirou.</p>
            <Button
              onClick={() => {
                setState({ kind: "loading" });
                fetch("/api/whatsapp/qr").then(async (r) => {
                  const b = await r.json();
                  if (r.ok) setState({ kind: "ready", qrcode: b.qrcode, pairingCode: b.pairingCode });
                });
              }}
            >
              Gerar novo
            </Button>
          </div>
        )}

        {state.kind === "connected" && <p className="text-green-700">✅ Reconectado!</p>}

        {state.kind === "error" && <p className="text-red-700">{state.message}</p>}

        {pollFailCount >= POLL_FAILURE_THRESHOLD && state.kind !== "connected" && (
          <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-700">
            Conexão instável — não fechamos pra você não perder progresso.
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
