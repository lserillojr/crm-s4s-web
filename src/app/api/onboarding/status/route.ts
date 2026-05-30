import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { n8nStatus } from "@/lib/onboarding/n8n-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const auditId = new URL(req.url).searchParams.get("audit_id");
  if (!auditId) return NextResponse.json({ error: "missing_audit_id" }, { status: 400 });

  try {
    const { status, body } = await n8nStatus(auditId);
    return NextResponse.json(body, { status });
  } catch {
    return NextResponse.json({ error: "status_unavailable" }, { status: 502 });
  }
}
