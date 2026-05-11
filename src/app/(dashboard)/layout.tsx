import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-s4s-gray-light">
      <header className="border-b bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href="/"
            className="font-heading text-xl font-bold text-s4s-blue"
          >
            S4S
          </Link>
          <nav className="text-sm">
            <Link
              href="/dashboard"
              className="text-s4s-blue hover:underline"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
