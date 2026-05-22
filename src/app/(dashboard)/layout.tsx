import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-s4s-gray-light">
      <header className="border-b bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-s4s-blue">
            S4S
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-s4s-blue hover:underline">
              Dashboard
            </Link>
            <form action={sair}>
              <Button type="submit" variant="ghost" size="sm" data-testid="logout">
                Sair
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
