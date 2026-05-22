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
import { signIn } from "@/auth";

export default function LoginPage() {
  async function entrar() {
    "use server";
    await signIn("keycloak", { redirectTo: "/dashboard" });
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
            Entrar com S4S
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Link href="/signup" className="text-sm text-s4s-blue hover:underline">
          Criar conta
        </Link>
      </CardFooter>
    </Card>
  );
}
