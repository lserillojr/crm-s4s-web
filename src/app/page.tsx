import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";

// As server actions abaixo disparam `signIn`, que lê env do issuer Keycloak em
// runtime; sem isto a landing seria pré-renderizada estática em build.
export const dynamic = "force-dynamic";

/**
 * Landing root. Os dois CTAs disparam o SSO do Keycloak DIRETO (sem a parada
 * intermediária em /signup ou /login) — um clique só. As páginas /login e
 * /signup seguem existindo como destino do middleware/logout (casos de borda).
 */
export default function HomePage() {
  // "Já tenho conta": login normal → painel.
  async function entrar() {
    "use server";
    await signIn("keycloak", { redirectTo: "/dashboard" });
  }

  // "Começar grátis": tela de registro do Keycloak (prompt=create) → wizard.
  async function criarConta() {
    "use server";
    await signIn("keycloak", { redirectTo: "/wizard" }, { prompt: "create" });
  }

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
          <form action={criarConta}>
            <Button
              type="submit"
              size="lg"
              variant="secondary"
              className="text-s4s-blue"
              data-testid="signup-keycloak"
            >
              Começar grátis 7 dias
            </Button>
          </form>
          <form action={entrar}>
            <Button
              type="submit"
              size="lg"
              variant="outline"
              className="border-white bg-transparent text-white hover:bg-white hover:text-s4s-blue"
              data-testid="login-keycloak"
            >
              Já tenho conta
            </Button>
          </form>
        </div>
        <p className="pt-8 text-sm opacity-70">
          Versão: fase 1 scaffold • Sub-Projeto 2 do Portal Único
        </p>
      </div>
    </main>
  );
}
