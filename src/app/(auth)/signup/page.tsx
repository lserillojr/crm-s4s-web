import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { signIn } from "@/auth";

export default function SignupPage() {
  // Auto-registro via Keycloak: `signIn` com `prompt=create` leva direto à
  // tela de cadastro do realm (OIDC "Initiating User Registration"). O Auth.js
  // monta redirect_uri/state corretamente — não montar a URL à mão.
  const keycloakReady = Boolean(env.AUTH_KEYCLOAK_ISSUER);

  async function criarConta() {
    "use server";
    await signIn("keycloak", { redirectTo: "/dashboard" }, { prompt: "create" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta na S4S</CardTitle>
        <CardDescription>Comece a atender com IA em minutos</CardDescription>
      </CardHeader>
      <CardContent>
        {keycloakReady ? (
          <form action={criarConta}>
            <Button type="submit" className="w-full" data-testid="signup-keycloak">
              Criar conta
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="signup-unavailable">
            Cadastro indisponível no momento. Tente novamente em instantes.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/login" className="text-sm text-s4s-blue hover:underline">
          Já tenho conta
        </Link>
      </CardFooter>
    </Card>
  );
}
