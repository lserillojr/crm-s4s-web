import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "./status-pill";
import type { IntegrationHealth } from "@/lib/integrations/get-integration-health";

type GoogleData = IntegrationHealth["google"];

const RECONNECT_HREF = "/api/oauth/google/start?returnTo=/settings/integracoes";

function relativeTime(date: Date | null): string {
  if (date === null) return "ainda não usado";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function GoogleCalendarCard({ data }: { data: GoogleData }) {
  return (
    <Card data-testid="google-calendar-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar aria-hidden="true" className="h-4 w-4 text-blue-600" />
          Google Calendar
        </CardTitle>
        <StatusPill level={data.level} />
      </CardHeader>
      <CardContent className="space-y-3">
        {data.level === "unconnected" && (
          <>
            <p className="text-sm">Não conectado</p>
            <p className="text-xs text-muted-foreground">
              Sua IA vai pedir pro atendente confirmar horários até você conectar.
            </p>
            <Link
              href={RECONNECT_HREF}
              className="inline-flex h-9 items-center justify-center rounded-md bg-s4s-blue px-4 text-sm font-medium text-white hover:bg-s4s-blue/90"
            >
              Conectar Google
            </Link>
          </>
        )}

        {data.level === "error" && (
          <>
            <p className="text-sm font-medium text-red-700">Acesso revogado</p>
            <p className="text-xs text-muted-foreground">
              Você ou alguém revogou o acesso no Google. Reconecte pra IA voltar a agendar.
            </p>
            <Link
              href={RECONNECT_HREF}
              className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
            >
              Reconectar
            </Link>
          </>
        )}

        {data.level === "ok" && (
          <>
            <p className="text-sm">Conectado</p>
            <p className="text-xs text-muted-foreground">
              Calendário: <code>{data.calendarId ?? "primary"}</code> · Última agenda criada {relativeTime(data.lastUsedAt)}
            </p>
            <Link href={RECONNECT_HREF} className="text-xs text-s4s-blue hover:underline">
              Reconectar
            </Link>
          </>
        )}

        {data.level === "warn" && (
          <>
            <p className="text-sm">Sem uso recente</p>
            <p className="text-xs text-muted-foreground">
              A gente não confirma a conexão {relativeTime(data.lastUsedAt)}. Pode estar OK, mas reconecte se notar problemas.
            </p>
            <Link href={RECONNECT_HREF} className="text-xs text-s4s-blue hover:underline">
              Reconectar
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
