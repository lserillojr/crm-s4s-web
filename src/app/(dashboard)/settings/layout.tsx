import Link from "next/link";

/**
 * Sub-layout do grupo /settings dentro do dashboard.
 * Aninhado em (dashboard)/layout.tsx; só adiciona header próprio +
 * breadcrumb simples. Cores S4S.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <nav className="text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <span className="mx-1">/</span>
          <span className="text-s4s-gray-dark">Configurações</span>
        </nav>
        <h1 className="mt-1 font-heading text-3xl font-bold text-s4s-blue">
          Configurações
        </h1>
      </div>
      {children}
    </div>
  );
}
