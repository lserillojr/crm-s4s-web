import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isProtectedPath } from "@/lib/auth/route-guard";

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
