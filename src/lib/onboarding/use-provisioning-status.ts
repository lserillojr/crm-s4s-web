"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStatus } from "@/lib/onboarding/client";
import type { ProvisionStatus, StatusResult } from "@/lib/onboarding/contract";

const TERMINAL: ReadonlySet<ProvisionStatus> = new Set(["success", "partial_failure", "failed"]);

interface Options {
  /** Intervalo de polling em ms (default 5000 — spec §contrato). */
  intervalMs?: number;
  /**
   * Tempo máx. preso em `in_progress` antes de desistir (default 120000).
   * O `in_progress` deveria virar `awaiting_qr_scan`/`success` em segundos; se
   * trava (ex: o Worker falhou e não conseguiu gravar `partial_failure` —
   * limitação do Error Trigger do n8n), a tela ficaria em spinner eterno. O
   * timeout transforma isso num erro gracioso com "tentar de novo".
   */
  timeoutMs?: number;
}

export interface ProvisioningStatusState {
  status: StatusResult | null;
  error: string | null;
  loading: boolean;
  /** Preso em `in_progress` além do `timeoutMs` — provável falha no Worker. */
  timedOut: boolean;
  /** Força uma busca imediata (botão "atualizar QR" / "tentar de novo"). */
  refresh: () => Promise<void>;
}

/**
 * Faz polling de `/api/onboarding/status` até um estado terminal (success/
 * partial_failure/failed). `awaiting_qr_scan` NÃO é terminal — continua o
 * polling até o webhook Evolution (WF13) virar pra `success`.
 */
export function useProvisioningStatus(
  auditId: string | null,
  { intervalMs = 5000, timeoutMs = 120000 }: Options = {},
): ProvisioningStatusState {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const stoppedRef = useRef(false);
  const mountedRef = useRef(true);
  const inProgressCountRef = useRef(0);
  const maxInProgressPolls = Math.max(1, Math.ceil(timeoutMs / intervalMs));

  const poll = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    try {
      const result = await fetchStatus(auditId);
      if (!mountedRef.current) return;
      setStatus(result);
      setError(null);
      if (TERMINAL.has(result.status)) {
        stoppedRef.current = true;
      } else if (result.status === "in_progress") {
        inProgressCountRef.current += 1;
        if (inProgressCountRef.current >= maxInProgressPolls) {
          setTimedOut(true);
          stoppedRef.current = true;
        }
      } else {
        // progrediu (ex: awaiting_qr_scan) → zera o contador de timeout.
        inProgressCountRef.current = 0;
      }
    } catch {
      if (mountedRef.current) setError("Não consegui checar o status. Tentando de novo...");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [auditId, maxInProgressPolls]);

  const refresh = useCallback(async () => {
    // "Tentar de novo": reativa o polling e dá outra janela de timeout.
    stoppedRef.current = false;
    inProgressCountRef.current = 0;
    setTimedOut(false);
    await poll();
  }, [poll]);

  useEffect(() => {
    if (!auditId) return;
    mountedRef.current = true;
    stoppedRef.current = false;
    inProgressCountRef.current = 0;
    setTimedOut(false);
    void poll();
    const timer = setInterval(() => {
      if (stoppedRef.current) return;
      void poll();
    }, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [auditId, intervalMs, poll]);

  return { status, error, loading, timedOut, refresh };
}
