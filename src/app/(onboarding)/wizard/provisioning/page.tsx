"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useProvisioningStatus } from "@/lib/onboarding/use-provisioning-status";
import { ProvisioningView } from "@/components/onboarding/provisioning-view";

/**
 * Tela pós-submit do wizard. Lê `?audit_id`, faz polling do status e renderiza
 * a fase atual (preparando → QR → pronto). NÃO é um step do wizard de coleta —
 * o slug "provisioning" não está em WIZARD_STEPS, então o ProgressHeader cai no
 * fallback do step 0 (cosmético, sem impacto funcional).
 */
function ProvisioningInner() {
  const auditId = useSearchParams().get("audit_id");
  const { status, error, loading, refresh } = useProvisioningStatus(auditId);

  if (!auditId) {
    return (
      <p className="text-sm text-muted-foreground">
        Sessão de ativação não encontrada. Volte ao início do cadastro.
      </p>
    );
  }

  return (
    <ProvisioningView
      status={status}
      error={error}
      refreshing={loading}
      onRefresh={() => void refresh()}
    />
  );
}

export default function ProvisioningPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
      <ProvisioningInner />
    </Suspense>
  );
}
