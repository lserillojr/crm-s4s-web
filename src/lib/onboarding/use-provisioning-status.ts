"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStatus } from "@/lib/onboarding/client";
import type { ProvisionStatus, StatusResult } from "@/lib/onboarding/contract";

const TERMINAL: ReadonlySet<ProvisionStatus> = new Set(["success", "partial_failure", "failed"]);

interface Options {
  /** Intervalo de polling em ms (default 5000 — spec §contrato). */
  intervalMs?: number;
}

export interface ProvisioningStatusState {
  status: StatusResult | null;
  error: string | null;
  loading: boolean;
  /** Força uma busca imediata (botão "atualizar QR"). */
  refresh: () => Promise<void>;
}

/**
 * Faz polling de `/api/onboarding/status` até um estado terminal (success/
 * partial_failure/failed). `awaiting_qr_scan` NÃO é terminal — continua o
 * polling até o webhook Evolution (WF13) virar pra `success`.
 */
export function useProvisioningStatus(
  auditId: string | null,
  { intervalMs = 5000 }: Options = {},
): ProvisioningStatusState {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    try {
      const result = await fetchStatus(auditId);
      setStatus(result);
      setError(null);
      if (TERMINAL.has(result.status)) stoppedRef.current = true;
    } catch {
      setError("Não consegui checar o status. Tentando de novo...");
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    if (!auditId) return;
    stoppedRef.current = false;
    void poll();
    const timer = setInterval(() => {
      if (stoppedRef.current) return;
      void poll();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [auditId, intervalMs, poll]);

  return { status, error, loading, refresh: poll };
}
