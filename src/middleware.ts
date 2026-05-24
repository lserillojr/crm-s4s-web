import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { isProtectedPath } from "@/lib/auth/route-guard";

// Monta um `auth` edge-safe a partir do config SEM DB (o `@/auth` completo
// importa o client Postgres via callback signIn, que quebraria o bundle edge).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  if (!req.auth && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  // Roda em tudo menos assets, _next e as rotas internas do Auth.js.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/healthz).*)"],
};
