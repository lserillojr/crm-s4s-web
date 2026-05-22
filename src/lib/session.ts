import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/** Pra server components em rotas protegidas: garante sessão ou redireciona. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}
