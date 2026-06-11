"use client";
import { useDashboardSummary } from "@/lib/dashboard/use-dashboard-summary";
import { MessagesCard } from "@/components/dashboard/messages-card";
import { LeadsCard } from "@/components/dashboard/leads-card";
import { NextMeetingCard } from "@/components/dashboard/next-meeting-card";
import { FollowupInviteCard } from "@/components/followup/invite-card";

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

  // `|| ""` (não `??`): string vazia do nome também não deve renderizar vírgula/traço no header
  const userName = data?.greeting.userName || "";
  const businessName = data?.greeting.businessName || "";
  const week = data?.weekConversations;
  const ct = data?.conversationsToday ?? null;
  const leads = data?.leadsNew ?? null;

  return (
    <div className="container space-y-6 py-8">
      <header className="space-y-1">
        <h1
          className="font-heading text-3xl font-bold"
          data-testid="dashboard-greeting"
        >
          Bem-vindo{userName ? `, ${userName}` : ""} 👋
          {businessName ? ` — ${businessName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {isLoading
            ? "Carregando seu resumo…"
            : week == null
              ? "Resumo indisponível no momento."
              : `Sua IA atendeu ${week} conversa${week === 1 ? "" : "s"} esta semana.`}
        </p>
      </header>

      <FollowupInviteCard />

      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        aria-label="Resumo do dia"
      >
        <MessagesCard
          count={ct?.count ?? 0}
          trend={ct?.trend ?? "flat"}
          vsYesterday={ct?.vsYesterday ?? 0}
        />
        <LeadsCard count={leads?.count ?? 0} names={leads?.names ?? []} />
        <NextMeetingCard meeting={data?.nextMeeting ?? null} />
      </section>

      {isError && (
        <p className="text-xs text-muted-foreground">
          Não foi possível carregar alguns dados agora. Tente atualizar a
          página.
        </p>
      )}
    </div>
  );
}
