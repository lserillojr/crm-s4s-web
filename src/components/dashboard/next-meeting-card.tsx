import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Card "Próxima reunião" — terceiro dos 3 cards do D1.
 *
 * Aceita `null` quando não há reunião agendada → mostra "—".
 * Formata a data em pt-BR com 3 buckets:
 * - mesmo dia       → "Hoje 14h00"
 * - dia seguinte    → "Amanhã 09h00"
 * - depois de amanhã+ → "qua, 15/05 14h00"
 *
 * Server component (sem hooks). A função `formatMeetingWhen` é exportada
 * pra ser testada isoladamente com `now` injetado.
 */
export type NextMeetingCardProps = {
  meeting: {
    withName: string;
    whenISO: string;
    topic: string;
  } | null;
};

const WEEKDAY_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/**
 * Formata um ISO string da reunião em pt-BR relativo a `now`.
 *
 * `now` é opcional pra facilitar testes determinísticos. Default = `new Date()`.
 */
export function formatMeetingWhen(whenISO: string, now: Date = new Date()): string {
  const when = new Date(whenISO);
  if (Number.isNaN(when.getTime())) return "—";

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(when).getTime() - startOfDay(now).getTime()) /
      (24 * 60 * 60 * 1000)
  );

  const hh = String(when.getHours()).padStart(2, "0");
  const mm = String(when.getMinutes()).padStart(2, "0");
  const time = `${hh}h${mm}`;

  if (diffDays === 0) return `Hoje ${time}`;
  if (diffDays === 1) return `Amanhã ${time}`;

  // Fora da janela "hoje/amanhã" → "qua, 15/05 14h00"
  const weekday = WEEKDAY_PT[when.getDay()] ?? "";
  const dd = String(when.getDate()).padStart(2, "0");
  const mo = String(when.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${dd}/${mo} ${time}`;
}

export function NextMeetingCard({ meeting }: NextMeetingCardProps) {
  return (
    <Card data-testid="next-meeting-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Próxima reunião
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {meeting ? (
          <>
            <p
              className="font-heading text-2xl font-bold text-s4s-blue"
              data-testid="next-meeting-when"
            >
              {formatMeetingWhen(meeting.whenISO)}
            </p>
            <p className="text-sm font-medium text-foreground">
              com {meeting.withName}
            </p>
            <p className="text-sm text-muted-foreground">{meeting.topic}</p>
          </>
        ) : (
          <p
            className="font-heading text-2xl font-bold text-muted-foreground"
            data-testid="next-meeting-when"
          >
            —
          </p>
        )}
      </CardContent>
    </Card>
  );
}
