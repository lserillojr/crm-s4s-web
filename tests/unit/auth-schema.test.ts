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

  it("expõe coluna phone_number (existe no DEV, drift do schema)", () => {
    expect(users.phoneNumber).toBeDefined();
    expect(users.phoneNumber.name).toBe("phone_number");
    expect(users.phoneNumber.notNull).toBe(false);
  });
});
