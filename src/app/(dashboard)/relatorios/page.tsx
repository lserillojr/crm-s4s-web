import { auth } from "@/auth";
import { getPool } from "@/lib/db/pool";
import { getTenantReportsAccess } from "@/lib/db/reports-access";
import { buildDetalhadoSrc } from "@/lib/embed-targets";
import { RelatoriosClient } from "@/components/relatorios/relatorios-client";
import { RelatoriosTabs } from "@/components/relatorios/relatorios-tabs";

export default async function RelatoriosPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? null;

  let detalhadoEnabled = false;
  let detalhadoSrc: string | null = null;
  if (tenantId) {
    const access = await getTenantReportsAccess(getPool(), tenantId);
    detalhadoEnabled = access.reportsDetailedEnabled;
    if (detalhadoEnabled) {
      detalhadoSrc = buildDetalhadoSrc(
        process.env.NEXT_PUBLIC_CHATWOOT_URL ?? null,
        access.chatwootAccountId,
      );
    }
  }

  return (
    <div className="container space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Veja, em poucos números, o que a sua IA fez por você.
        </p>
      </header>
      {detalhadoEnabled ? (
        <RelatoriosTabs detalhadoSrc={detalhadoSrc} />
      ) : (
        <RelatoriosClient />
      )}
    </div>
  );
}
