import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getOnboardingState,
  saveOnboardingState,
  type OnboardingState,
} from "@/lib/onboarding/server-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const state = await getOnboardingState(email);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Body malformado → 400 (não tratar como patch vazio silencioso).
  let patch: Partial<OnboardingState>;
  try {
    patch = (await req.json()) as Partial<OnboardingState>;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Erros do server-state (ex: user não encontrado) → 500 genérico, sem ecoar a
  // mensagem (não vazar email/detalhe interno pro cliente).
  try {
    const state = await saveOnboardingState(email, patch);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
