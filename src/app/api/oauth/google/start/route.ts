import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { buildGoogleAuthUrl } from "@/lib/oauth/google";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return Response.redirect(new URL("/login?next=/wizard/calendar", req.url));
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/wizard/calendar";

  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/oauth/google/callback",
    maxAge: 600,
  });
  cookieStore.set("gcal_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/oauth/google/callback",
    maxAge: 600,
  });

  return Response.redirect(buildGoogleAuthUrl({ state }));
}
