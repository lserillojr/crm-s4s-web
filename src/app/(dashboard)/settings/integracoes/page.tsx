import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/pool";
import { getIntegrationHealth } from "@/lib/integrations/get-integration-health";
import { GoogleCalendarCard } from "@/components/integrations/google-calendar-card";
import { WhatsAppCard } from "@/components/integrations/whatsapp-card";
import { InstagramCard } from "@/components/integrations/instagram-card";

export const dynamic = "force-dynamic";

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/login?next=/settings/integracoes");
  }
  const health = await getIntegrationHealth(getPool(), session.user.tenantId);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">
          Veja o status das suas integrações e reconecte quando precisar.
        </p>
      </header>

      {searchParams.connected === "1" && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          ✅ Google Calendar reconectado.
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Não conseguimos reconectar. Tente de novo.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Integrações">
        <GoogleCalendarCard data={health.google} />
        <WhatsAppCard data={health.whatsapp} />
        <InstagramCard />
      </section>
    </div>
  );
}
