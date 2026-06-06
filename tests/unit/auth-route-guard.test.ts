import { describe, it, expect } from "vitest";
import { isProtectedPath } from "@/lib/auth/route-guard";

describe("isProtectedPath", () => {
  it.each([
    ["/dashboard", true],
    ["/dashboard/qualquer", true],
    ["/wizard", true],
    ["/wizard/whatsapp", true],
    ["/settings/working-hours", true],
    // todas as telas do grupo (dashboard) exigem sessão (senão vaza o shell)
    ["/relatorios", true],
    ["/agenda", true],
    ["/atendimento", true],
    ["/funil", true],
    ["/contatos", true],
  ])("%s é protegido", (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });

  it.each([
    ["/", false],
    ["/login", false],
    ["/signup", false],
    ["/api/healthz", false],
    ["/api/auth/callback/keycloak", false],
  ])("%s é público", (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });
});
