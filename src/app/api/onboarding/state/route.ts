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
  const state = await getOnboardingState(email);
  return NextResponse.json({ state });
}

export async function PUT(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const patch = (await req.json().catch(() => ({}))) as Partial<OnboardingState>;
  const state = await saveOnboardingState(email, patch);
  return NextResponse.json({ state });
}
