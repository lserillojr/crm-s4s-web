import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Card "Mensagens hoje" — primeiro dos 3 cards do D1.
 *
 * Mostra o contador grande + comparação com ontem.
 * - trend=up → verde com seta pra cima
 * - trend=down → vermelho com seta pra baixo
 * - trend=flat → cinza, sem seta
 *
 * Server component (não usa hooks) — recebe props direto.
 */
export type MessagesCardProps = {
  count: number;
  trend: "up" | "down" | "flat";
  vsYesterday: number;
};

export function MessagesCard({ count, trend, vsYesterday }: MessagesCardProps) {
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const color =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <Card data-testid="messages-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Conversas hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p
          className="font-heading text-4xl font-bold text-s4s-blue"
          data-testid="messages-count"
        >
          {count}
        </p>
        <p className={cn("text-sm font-medium", color)}>
          {arrow} {Math.abs(vsYesterday)} vs ontem
        </p>
      </CardContent>
    </Card>
  );
}
