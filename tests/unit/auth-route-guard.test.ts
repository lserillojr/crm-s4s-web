import { describe, it, expect } from "vitest";
import { isProtectedPath } from "@/lib/auth/route-guard";

describe("isProtectedPath", () => {
  it.each([
    ["/dashboard", true],
    ["/dashboard/qualquer", true],
    ["/wizard", true],
    ["/wizard/whatsapp", true],
    ["/settings/working-hours", true],
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
