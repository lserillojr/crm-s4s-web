import { redirect } from "next/navigation";
import { signOut, auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { IntegrationHealthBanner } from "@/components/integrations/integration-health-banner";
import {
  needsOnboarding,
  getTenantIdByEmail,
} from "@/lib/auth/onboarding-guard";
import { getPool } from "@/lib/db/pool";
import {
  getIntegrationHealth,
  type IntegrationHealth,
} from "@/lib/integrations/get-integration-health";
import { Sidebar } from "@/components/shell/sidebar";
import { PrewarmSso } from "@/components/shell/prewarm-sso";
import { QueryProvider } from "@/components/providers/query-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const session = await auth();

  // Guarda de onboarding: um user autenticado SEM tenant (cadastro nunca
  // finalizado — o provisionamento jamais rodou) não pode entrar no shell.
  // Sem tenant, Atendimento/Config batem em 401 e o Funil cai na company
  // default do Odoo (dados de outro cliente). Mandamos finalizar o wizard.
  // O `tenantId` da sessão pode estar defasado logo após o provisionamento, por
  // isso, na sua ausência, consultamos a fonte autoritativa (banco) antes de
  // decidir — e só redirecionamos se AMBAS as fontes estiverem sem tenant.
  let tenantId = session?.user?.tenantId ?? null;
  if (session?.user && !tenantId) {
    let lookupOk = true;
    try {
      tenantId = await getTenantIdByEmail(session.user.email);
    } catch {
      lookupOk = false; // DB indisponível: fail-open, não tranca o user fora.
    }
    if (
      lookupOk &&
      needsOnboarding({ sessionTenantId: session.user.tenantId, dbTenantId: tenantId })
    ) {
      redirect("/wizard");
    }
  }

  let health: IntegrationHealth | null = null;
  if (tenantId) {
    try {
      health = await getIntegrationHealth(getPool(), tenantId);
    } catch {
      health = null;
    }
  }

  const userName = session?.user?.name ?? "";

  return (
    <div className="flex h-screen flex-col bg-s4s-gray-light">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4">
        <span className="font-heading text-xl font-bold text-s4s-blue">S4S</span>
        <div className="flex items-center gap-4 text-sm">
          {userName && (
            <span className="text-s4s-blue">Bem-vindo, {userName} 👋</span>
          )}
          <form action={sair}>
            <Button type="submit" variant="ghost" size="sm" data-testid="logout">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        {/* flex-col + altura determinística: o banner é shrink-0 e o conteúdo
            ocupa o resto exato. Telas embutidas (iframe h-full) preenchem esse
            espaço sem competir com o banner num overflow — o scroll fica só no
            wrapper interno, evitando o loop de ResizeObserver do kanban Odoo. */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {health && (
            <div className="shrink-0 px-6 pt-4">
              <IntegrationHealthBanner health={health} />
            </div>
          )}
          {/* scrollbar-gutter:stable reserva a calha da barra de rolagem
              permanentemente. Sem isso, a barra aparecendo/sumindo muda a largura
              do iframe em ~15px → o ResizeObserver do kanban Odoo (única view
              sensível a tamanho) recalcula em loop e trava a thread compartilhada
              (dev-app e dev-backoffice são same-site → mesmo processo). Ver #16. */}
          <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </div>
      <PrewarmSso />
    </div>
  );
}
