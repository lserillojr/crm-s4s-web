/** Prefixos de rota que exigem sessão autenticada. */
const PROTECTED_PREFIXES = ["/dashboard", "/wizard", "/settings"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
