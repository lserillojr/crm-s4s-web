import { describe, it, expect } from "vitest";
import { mapJwtClaims, mapSession } from "@/lib/auth/claims";

describe("mapJwtClaims", () => {
  it("copia tenant_id/role/phone_number da fonte pro token no primeiro login", () => {
    const token = { sub: "u1" };
    const source = {
      tenant_id: "11111111-1111-1111-1111-111111111111",
      role: "owner",
      phone_number: "+5511999999999",
    };
    const out = mapJwtClaims(token, source);
    expect(out.tenantId).toBe("11111111-1111-1111-1111-111111111111");
    expect(out.role).toBe("owner");
    expect(out.phoneNumber).toBe("+5511999999999");
  });

  it("tenant_id ausente/vazio vira null (user pré-wizard)", () => {
    const out = mapJwtClaims({ sub: "u1" }, { tenant_id: "", role: "owner" });
    expect(out.tenantId).toBeNull();
  });

  it("sem role assume 'owner'", () => {
    const out = mapJwtClaims({ sub: "u1" }, { tenant_id: "t" });
    expect(out.role).toBe("owner");
  });

  it("sem fonte (refresh) retorna o token intacto", () => {
    const token = { sub: "u1", tenantId: "t", role: "owner" };
    expect(mapJwtClaims(token, undefined)).toEqual(token);
  });
});

describe("mapSession", () => {
  it("expõe tenantId/role/phoneNumber em session.user", () => {
    const session = { user: { name: "Maria" } } as any;
    const token = { tenantId: "t", role: "agent", phoneNumber: "+55" } as any;
    const out = mapSession(session, token);
    expect(out.user.tenantId).toBe("t");
    expect(out.user.role).toBe("agent");
    expect(out.user.phoneNumber).toBe("+55");
  });

  it("token sem tenantId → session.user.tenantId null", () => {
    const out = mapSession({ user: {} } as any, {} as any);
    expect(out.user.tenantId).toBeNull();
    expect(out.user.role).toBe("owner");
  });
});
