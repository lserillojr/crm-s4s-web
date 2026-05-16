"use client";

import QRCode from "react-qr-code";

import { cn } from "@/lib/utils";

/**
 * Tutorial visual de pareamento do WhatsApp via QR Code (provider=evolution).
 *
 * Mostra os 4 passos que o MEI segue no celular + um QR code placeholder.
 * O QR real só é gerado depois que a conta é criada — aqui é educacional,
 * pra reduzir ansiedade ("ah, é isso que vai aparecer").
 */
const STEPS: ReadonlyArray<{ title: string; description?: string }> = [
  { title: "Abra o WhatsApp no seu celular" },
  { title: "Toque em Configurações (⚙️) → Aparelhos conectados" },
  { title: 'Toque em "Conectar um aparelho"' },
  { title: "Escaneie o código abaixo. Pronto — a IA já tá ouvindo." },
];

export function WhatsappQrTutorial({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="whatsapp-tutorial-title"
      className={cn(
        "rounded-md border border-s4s-blue/30 bg-s4s-blue/5 p-4",
        className
      )}
    >
      <h3
        id="whatsapp-tutorial-title"
        className="mb-3 text-sm font-semibold text-s4s-blue"
      >
        Como vai funcionar
      </h3>

      <ol className="space-y-3">
        {STEPS.map((step, idx) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-s4s-blue text-xs font-semibold text-white"
            >
              {idx + 1}
            </span>
            <span className="text-sm">{step.title}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-md border bg-white p-4">
        <QRCode value="s4s://onboarding-mock" size={200} />
        <p className="text-xs text-muted-foreground">
          QR demo — o real aparece após criação da conta
        </p>
      </div>
    </section>
  );
}

/**
 * Aviso pra quem escolhe Cloud API: o caminho é mais robusto mas tem
 * lead time da aprovação Meta. Oferecemos saída: começar com QR e migrar.
 */
export function CloudApiNotice({ className }: { className?: string }) {
  return (
    <aside
      role="note"
      className={cn(
        "rounded-md border border-s4s-magenta/30 bg-s4s-magenta/5 p-4 text-sm",
        className
      )}
    >
      <p className="font-medium text-s4s-magenta">
        Aprovação Meta leva ~5 dias úteis.
      </p>
      <p className="mt-1 text-muted-foreground">
        Você pode começar com QR Code e migrar depois.
      </p>
    </aside>
  );
}
