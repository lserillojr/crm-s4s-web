"use client";

import { Button } from "@/components/ui/button";
import { mapGoogleError } from "@/lib/oauth/google";

export type GcalConnectState = "idle" | "loading" | "connected" | "error" | "skipped";

export interface GcalConnectButtonProps {
  state: GcalConnectState;
  calendarName?: string | null;
  errorCode?: string;
  onSkip: () => void;
  returnTo?: string;
}

const START_URL = "/api/oauth/google/start";

export function GcalConnectButton({
  state,
  calendarName,
  errorCode,
  onSkip,
  returnTo,
}: GcalConnectButtonProps) {
  const startHref = returnTo
    ? `${START_URL}?returnTo=${encodeURIComponent(returnTo)}`
    : START_URL;

  if (state === "loading") {
    return (
      <div role="status" className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
        Aguardando autorização do Google…
      </div>
    );
  }

  if (state === "connected") {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
        <span className="font-medium">✅ Conectado:</span>{" "}
        {calendarName ?? "calendário principal"}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
          🚨 {mapGoogleError(errorCode ?? "internal")}
        </div>
        <Button type="button" asChild>
          <a href={startHref}>Tentar de novo</a>
        </Button>
        <Button type="button" variant="link" onClick={onSkip}>
          Conectar depois
        </Button>
      </div>
    );
  }

  if (state === "skipped") {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
          ⚠️ Sua IA vai pedir pro seu atendente confirmar os agendamentos manualmente.
        </div>
        <Button type="button" asChild>
          <a href={startHref}>Conectar agora</a>
        </Button>
      </div>
    );
  }

  // idle
  return (
    <div className="space-y-3">
      <Button type="button" asChild>
        <a href={startHref}>Conectar Google Calendar</a>
      </Button>
      <Button type="button" variant="link" onClick={onSkip}>
        Conectar depois
      </Button>
    </div>
  );
}
