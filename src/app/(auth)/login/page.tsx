import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";

export default function LoginPage() {
  async function entrar() {
    "use server";
    await signIn("keycloak", { redirectTo: "/dashboard" });
  }

  // "Criar conta" leva DIRETO à tela de registro do Keycloak (prompt=create),
  // sem a parada intermediária em /signup — um clique só (feedback Anselmo).
  async function criarConta() {
    "use server";
    await signIn("keycloak", { redirectTo: "/wizard" }, { prompt: "create" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar na S4S</CardTitle>
        <CardDescription>Acesse seu painel de atendimento</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={entrar}>
          <Button type="submit" className="w-full" data-testid="login-keycloak">
            Entrar
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <form action={criarConta}>
          <button
            type="submit"
            className="text-sm text-s4s-blue hover:underline"
            data-testid="signup-keycloak"
          >
            Criar conta
          </button>
        </form>
      </CardFooter>
    </Card>
  );
}
