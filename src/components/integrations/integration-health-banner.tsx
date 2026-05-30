import Link from "next/link";
import type { IntegrationHealth } from "@/lib/integrations/get-integration-health";

export function IntegrationHealthBanner({ health }: { health: IntegrationHealth }) {
  const gErr = health.google.level === "error";
  const waErr = health.whatsapp.level === "error";
  const errors = (gErr ? 1 : 0) + (waErr ? 1 : 0);
  if (errors === 0) return null;

  let summary: string;
  if (errors === 2) {
    summary = "2 integrações precisam de atenção";
  } else if (gErr) {
    summary = "Sua agenda Google está desconectada";
  } else {
    summary = "Seu WhatsApp está desconectado";
  }

  return (
    <div
      data-testid="integration-health-banner"
      role="alert"
      className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <span>⚠️ {summary}</span>
      <Link href="/settings/integracoes" className="font-medium underline hover:no-underline">
        Resolver agora →
      </Link>
    </div>
  );
}
