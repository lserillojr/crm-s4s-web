import { Calendar, MessageSquare, UserPlus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Dashboard D1 — 3 cards (mensagens, leads, próxima reunião).
 *
 * Story 7.5-DEV — fase 1: **dados mockados hardcoded**.
 *
 * "Única janela que o MEI abre" — sem esses 3 números o MEI não enxerga
 * valor entregue e churna nos R$ 79/mês (PRD Story 7.5-DEV).
 *
 * Fase 2 (próxima): trocar `MOCK_DATA` por fetch ao WF05 (Painel API n8n)
 * usando `chatwoot_account_id` do tenant logado, quando Auth/Keycloak (SP3)
 * conectar o tenant_id ao request. A UI fica idêntica — só o source de dados muda.
 *
 * Server Component: nenhum hook/state, só render estático com constantes.
 */
const MOCK_DATA = {
  greeting: { name: "Maria" },
  weeklyStats: { conversations: 47 },
  cards: {
    messagesToday: { count: 12, delta: "+3 nos últimos 30 minutos" },
    newLeadsWeek: { count: 3, delta: "vs 1 na semana passada" },
    nextMeeting: {
      time: "Hoje, 16h",
      with: "Maria Silva — corte e escova",
    },
  },
} as const;

export default function DashboardPage() {
  const { greeting, weeklyStats, cards } = MOCK_DATA;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          className="font-heading text-3xl font-bold"
          data-testid="dashboard-greeting"
        >
          Bem-vinda, {greeting.name} 👋
        </h1>
        <p className="text-muted-foreground">
          Sua IA atendeu {weeklyStats.conversations} conversas esta semana.
        </p>
      </header>

      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        aria-label="Resumo do dia"
      >
        <KpiCard
          testId="card-messages-today"
          title="Mensagens hoje"
          icon={
            <MessageSquare
              aria-hidden="true"
              className="h-4 w-4 text-s4s-blue"
            />
          }
          value={String(cards.messagesToday.count)}
          subtext={cards.messagesToday.delta}
        />

        <KpiCard
          testId="card-new-leads-week"
          title="Leads novos esta semana"
          icon={
            <UserPlus aria-hidden="true" className="h-4 w-4 text-s4s-blue" />
          }
          value={String(cards.newLeadsWeek.count)}
          subtext={cards.newLeadsWeek.delta}
        />

        <KpiCard
          testId="card-next-meeting"
          title="Próxima reunião"
          icon={
            <Calendar aria-hidden="true" className="h-4 w-4 text-s4s-blue" />
          }
          value={cards.nextMeeting.time}
          valueClassName="text-2xl"
          subtext={`com ${cards.nextMeeting.with}`}
        />
      </section>

      <p
        className="text-xs text-muted-foreground"
        data-testid="dashboard-phase1-notice"
      >
        Dados mostrados são exemplos. Quando você fizer login real (após
        Keycloak ativado), aqui aparecem os dados da sua conta.
      </p>
    </div>
  );
}

type KpiCardProps = {
  testId: string;
  title: string;
  icon: React.ReactNode;
  value: string;
  subtext: string;
  valueClassName?: string;
};

function KpiCard({
  testId,
  title,
  icon,
  value,
  subtext,
  valueClassName,
}: KpiCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={cn(
            "font-heading font-bold text-s4s-blue",
            valueClassName ?? "text-4xl"
          )}
        >
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}
