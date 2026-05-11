import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Landing root. Fase 1 scaffold: explica posicionamento + CTAs para signup/login.
 * Fase 2+ pode evoluir pra hero animado, prova social, FAQ etc.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-s4s-blue to-s4s-magenta p-8 text-white">
      <div className="max-w-2xl space-y-6 text-center">
        <h1 className="font-heading text-5xl font-bold leading-tight">
          S4S Recepcionista IA
        </h1>
        <p className="text-xl opacity-90">
          Sua secretária digital com IA, 24/7, atendendo no WhatsApp e Instagram.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-s4s-blue">
              Começar grátis 7 dias
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="outline"
              className="border-white bg-transparent text-white hover:bg-white hover:text-s4s-blue"
            >
              Já tenho conta
            </Button>
          </Link>
        </div>
        <p className="pt-8 text-sm opacity-70">
          Versão: fase 1 scaffold • Sub-Projeto 2 do Portal Único
        </p>
      </div>
    </main>
  );
}
