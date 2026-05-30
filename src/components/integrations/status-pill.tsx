import type { IntegrationLevel } from "@/lib/integrations/compute-level";
import { cn } from "@/lib/utils";

const ICON: Record<IntegrationLevel, string> = {
  ok: "✅",
  warn: "⚠️",
  error: "❌",
  unconnected: "➖",
  unavailable: "🔒",
};

const DEFAULT_LABEL: Record<IntegrationLevel, string> = {
  ok: "Conectado",
  warn: "Atenção",
  error: "Erro",
  unconnected: "Não conectado",
  unavailable: "Em breve",
};

const COLOR: Record<IntegrationLevel, string> = {
  ok: "text-green-700 bg-green-50",
  warn: "text-amber-700 bg-amber-50",
  error: "text-red-700 bg-red-50",
  unconnected: "text-muted-foreground bg-muted",
  unavailable: "text-muted-foreground bg-muted",
};

export function StatusPill({ level, label }: { level: IntegrationLevel; label?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", COLOR[level])}
      data-testid={`status-pill-${level}`}
    >
      <span aria-hidden="true">{ICON[level]}</span>
      <span>{label ?? DEFAULT_LABEL[level]}</span>
    </span>
  );
}
