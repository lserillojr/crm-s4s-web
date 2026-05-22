import { describe, it, expect } from "vitest";
import { users } from "@/lib/schema";

describe("schema.users — alinhado com migration 018", () => {
  it("password_hash é nullable (notNull false)", () => {
    expect(users.passwordHash.notNull).toBe(false);
  });

  it("expõe coluna auth_managed_by com default 'legacy'", () => {
    expect(users.authManagedBy).toBeDefined();
    expect(users.authManagedBy.name).toBe("auth_managed_by");
  });
});
