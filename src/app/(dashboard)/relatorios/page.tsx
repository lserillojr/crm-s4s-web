import { auth } from "@/auth";
import { getPool } from "@/lib/db/pool";
import { getTenantReportsAccess } from "@/lib/db/reports-access";
import { buildDetalhadoSrc } from "@/lib/embed-targets";
import { RelatoriosClient } from "@/components/relatorios/relatorios-client";
import { RelatoriosTabs } from "@/components/relatorios/relatorios-tabs";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? null;

  // A aba "Detalhado" é OPCIONAL (médio porte). Uma falha ao ler a flag NÃO pode
  // derrubar o Resumo (que é o core e não depende de DB no server): degrada para
  // Resumo-only em vez de propagar o erro para a tela inteira.
  let detalhadoEnabled = false;
  let detalhadoSrc: string | null = null;
  if (tenantId) {
    try {
      const access = await getTenantReportsAccess(getPool(), tenantId);
      detalhadoEnabled = access.reportsDetailedEnabled;
      if (detalhadoEnabled) {
        detalhadoSrc = buildDetalhadoSrc(
          process.env.NEXT_PUBLIC_CHATWOOT_URL ?? null,
          access.chatwootAccountId,
        );
      }
    } catch {
      detalhadoEnabled = false;
      detalhadoSrc = null;
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
