import Link from "next/link";
import { ProgressHeader } from "@/components/wizard/progress-header";
import { OnboardingStateSync } from "@/components/onboarding/onboarding-state-sync";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-s4s-gray-light">
      <OnboardingStateSync />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <Link
            href="/"
            className="font-heading text-xl font-bold text-s4s-blue"
          >
            S4S
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Já tenho conta
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <ProgressHeader />
          {children}
        </div>
      </main>
    </div>
  );
}
