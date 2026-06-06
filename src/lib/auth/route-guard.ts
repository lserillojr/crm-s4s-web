/**
 * Prefixos de rota que exigem sessão autenticada.
 * Inclui TODAS as telas do grupo (dashboard) — esquecer uma aqui vaza o shell
 * para anônimos (os dados seguem protegidos pela API, mas a casca abre). O layout
 * do grupo é o backstop server-side; este guard dá o redirect cedo no edge.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/wizard",
  "/settings",
  "/relatorios",
  "/agenda",
  "/atendimento",
  "/funil",
  "/contatos",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
