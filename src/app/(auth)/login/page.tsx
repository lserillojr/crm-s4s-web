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

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar na S4S</CardTitle>
        <CardDescription>
          Login coming soon — Sub-Projeto 2 fase 2 (Auth.js + Keycloak)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta é a fase 1 do scaffold. O login real será habilitado quando o
          Keycloak (Sub-Projeto 1) estiver operacional.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" disabled>
          Entrar (em breve)
        </Button>
        <Link
          href="/signup"
          className="text-sm text-s4s-blue hover:underline"
        >
          Criar conta
        </Link>
      </CardFooter>
    </Card>
  );
}
