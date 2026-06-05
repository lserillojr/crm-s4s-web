import { Card, CardContent } from "@/components/ui/card";

/**
 * Card individual do painel "Resumo": um número grande + a frase em linguagem MEI.
 * API mínima (só apresentação) — a frase já vem pronta de `@/lib/relatorios/frases`.
 */
export type NumeroCardProps = { destaque: string; frase: string };

export function NumeroCard({ destaque, frase }: NumeroCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="font-heading text-4xl font-bold text-s4s-blue">
          {destaque}
        </p>
        <p className="text-sm text-muted-foreground">{frase}</p>
      </CardContent>
    </Card>
  );
}
