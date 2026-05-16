import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Card "Leads novos" — segundo dos 3 cards do D1.
 *
 * Mostra contagem + lista vertical dos 3 nomes mais recentes.
 * Se `names` vier vazio, exibe "—" como fallback.
 *
 * Server component (sem hooks).
 */
export type LeadsCardProps = {
  count: number;
  names: string[];
};

export function LeadsCard({ count, names }: LeadsCardProps) {
  return (
    <Card data-testid="leads-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Leads novos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p
          className="font-heading text-4xl font-bold text-s4s-magenta"
          data-testid="leads-count"
        >
          {count}
        </p>
        {names.length > 0 ? (
          <ul className="space-y-1 text-sm text-foreground">
            {names.map((name) => (
              <li key={name} className="truncate">
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </CardContent>
    </Card>
  );
}
