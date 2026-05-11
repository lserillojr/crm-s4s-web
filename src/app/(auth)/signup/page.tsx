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

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta S4S</CardTitle>
        <CardDescription>
          Signup coming soon — Sub-Projeto 2 fase 2
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta é a fase 1 do scaffold. O signup self-service será habilitado
          quando o Keycloak (Sub-Projeto 1) e Auth.js OIDC estiverem prontos.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" disabled>
          Criar conta (em breve)
        </Button>
        <Link href="/login" className="text-sm text-s4s-blue hover:underline">
          Já tenho conta
        </Link>
      </CardFooter>
    </Card>
  );
}
