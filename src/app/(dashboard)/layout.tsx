import { signOut, auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { IntegrationHealthBanner } from "@/components/integrations/integration-health-banner";
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
  let health: IntegrationHealth | null = null;
  if (session?.user?.tenantId) {
    try {
      health = await getIntegrationHealth(getPool(), session.user.tenantId);
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
          <div className="min-h-0 flex-1 overflow-auto">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </div>
      <PrewarmSso />
    </div>
  );
}
