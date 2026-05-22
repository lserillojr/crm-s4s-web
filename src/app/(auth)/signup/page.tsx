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

export default function SignupPage() {
  // Endpoint de auto-registro do realm Keycloak (registration habilitado).
  const registrationUrl = env.AUTH_KEYCLOAK_ISSUER
    ? `${env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/registrations` +
      `?client_id=${env.AUTH_KEYCLOAK_ID ?? "web-simples"}` +
      `&response_type=code&scope=openid`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta na S4S</CardTitle>
        <CardDescription>Comece a atender com IA em minutos</CardDescription>
      </CardHeader>
      <CardContent>
        {registrationUrl ? (
          <Button asChild className="w-full" data-testid="signup-keycloak">
            <a href={registrationUrl}>Criar conta</a>
          </Button>
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
