"use client";

import { Button } from "@/components/ui/button";

/**
 * Render do QR real do Evolution (data-url base64 vindo do /status). Diferente
 * do `WhatsappQrTutorial` (mock educacional pré-submit), este é o pareamento
 * de verdade pós-provision. O QR pode expirar (TTL Evolution ~5min); o botão
 * "Atualizar QR" re-busca o /status (que devolve o QR regenerado server-side).
 */
const STEPS: ReadonlyArray<string> = [
  "Abra o WhatsApp no seu celular",
  "Toque em Configurações (⚙️) → Aparelhos conectados",
  'Toque em "Conectar um aparelho"',
  "Escaneie o código ao lado",
];

export function QrPairing({
  qrCodeUrl,
  onRefresh,
  refreshing,
}: {
  qrCodeUrl: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <ol className="flex-1 space-y-2">
        {STEPS.map((step, idx) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-s4s-blue text-xs font-semibold text-white"
            >
              {idx + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-[220px] w-[220px] items-center justify-center rounded-md border bg-white p-3">
          {qrCodeUrl ? (
            // QR é uma data-url PNG vinda do Evolution — <img> direto.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeUrl} alt="QR Code do WhatsApp" width={200} height={200} />
          ) : (
            <p className="px-4 text-center text-xs text-muted-foreground">
              Gerando seu QR Code...
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          {refreshing ? "Atualizando..." : "Atualizar QR"}
        </Button>
        <p className="text-xs text-muted-foreground">O código expira em ~5 min</p>
      </div>
    </div>
  );
}
