import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SettingsHub } from "@/components/settings/settings-hub";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/login?next=/settings");
  }

  return (
    <div className="container space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Ajuste as integrações, a base de conhecimento da sua IA e seus horários.
        </p>
      </header>
      <SettingsHub />
    </div>
  );
}
