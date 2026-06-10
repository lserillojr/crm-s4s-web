import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de navegação do shell (App Router): aparece automaticamente
 * enquanto a tela de destino do dashboard ainda está sendo carregada — dá
 * feedback imediato ao clicar num item do menu (feedback Anselmo: "senti
 * falta de algo indicando que a página está carregando").
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
