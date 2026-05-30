import Link from "next/link";
import { signOut, auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { IntegrationHealthBanner } from "@/components/integrations/integration-health-banner";
import { getPool } from "@/lib/db/pool";
import {
  getIntegrationHealth,
  type IntegrationHealth,
} from "@/lib/integrations/get-integration-health";
import { SsoLaunchers } from "@/components/sso/sso-launchers";
import { getSsoTargets } from "@/lib/sso-targets";

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

  return (
    <div className="min-h-screen bg-s4s-gray-light">
      <header className="border-b bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-s4s-blue">
            S4S
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <SsoLaunchers variant="nav" targets={getSsoTargets()} />
            <Link href="/dashboard" className="text-s4s-blue hover:underline">
              Dashboard
            </Link>
            <Link href="/settings/integracoes" className="text-s4s-blue hover:underline">
              Integrações
            </Link>
            <form action={sair}>
              <Button type="submit" variant="ghost" size="sm" data-testid="logout">
                Sair
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container py-8">
        {health && <IntegrationHealthBanner health={health} />}
        {children}
      </main>
    </div>
  );
}
