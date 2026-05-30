import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

import { ProvisioningView } from "@/components/onboarding/provisioning-view";
import type { StatusResult } from "@/lib/onboarding/contract";

const onRefresh = vi.fn();

function view(
  status: StatusResult | null,
  extra: Partial<Parameters<typeof ProvisioningView>[0]> = {},
) {
  return render(
    <ProvisioningView
      status={status}
      error={null}
      refreshing={false}
      onRefresh={onRefresh}
      {...extra}
    />,
  );
}

describe("ProvisioningView", () => {
  beforeEach(() => onRefresh.mockClear());

  it("in_progress: spinner + mensagem de preparação", () => {
    view({ audit_id: "a1", status: "in_progress", completed_steps: ["db_insert"] });
    expect(screen.getByText(/Preparando sua conta/i)).toBeInTheDocument();
  });

  it("awaiting_qr_scan: mostra o QR", () => {
    view({
      audit_id: "a1",
      status: "awaiting_qr_scan",
      completed_steps: [],
      qr_code_url: "data:image/png;base64,AAAA",
    });
    expect(screen.getByAltText(/QR Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Conecte seu WhatsApp/i)).toBeInTheDocument();
  });

  it("success: WhatsApp ✓ / IA ✓ + CTA pro painel", () => {
    view({
      audit_id: "a1",
      status: "success",
      completed_steps: [],
      tenant_id: "t1",
      magic_link: "https://m",
    });
    expect(screen.getByText(/Tudo pronto/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir pro painel/i })).toHaveAttribute("href", "/dashboard");
  });

  it("failed/partial_failure: mensagem amigável (user_message)", () => {
    view({
      audit_id: "a1",
      status: "partial_failure",
      completed_steps: [],
      user_message: "Estamos resolvendo.",
    });
    expect(screen.getByText(/Estamos resolvendo\./i)).toBeInTheDocument();
  });

  it("status nulo: estado de carregamento inicial", () => {
    view(null);
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it("success: mostra os launchers SSO (atendimento + backoffice)", () => {
    view({
      audit_id: "a1",
      status: "success",
      completed_steps: [],
      tenant_id: "t1",
    });
    // Sem env var no ambiente de teste, os launchers aparecem como botoes
    // (desabilitados) mas os rotulos estao presentes.
    expect(screen.getByText(/Abrir meu atendimento/i)).toBeInTheDocument();
    expect(screen.getByText(/Abrir meu backoffice/i)).toBeInTheDocument();
  });
});
