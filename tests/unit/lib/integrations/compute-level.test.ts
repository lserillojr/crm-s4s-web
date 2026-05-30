import { describe, it, expect } from "vitest";
import { computeGoogleLevel, computeWhatsAppLevel } from "@/lib/integrations/compute-level";

const NOW = new Date("2026-05-31T12:00:00Z");
const fresh = new Date("2026-05-31T08:00:00Z");
const old = new Date("2026-05-29T08:00:00Z");

describe("computeGoogleLevel", () => {
  it("retorna unconnected quando hasRefreshToken=false", () => {
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: null, hasRefreshToken: false }, NOW)
    ).toBe("unconnected");
  });

  it("retorna error quando revokedAt presente, mesmo com last_used recente", () => {
    expect(
      computeGoogleLevel({ gcalRevokedAt: fresh, gcalLastUsedAt: fresh, hasRefreshToken: true }, NOW)
    ).toBe("error");
  });

  it("retorna ok quando revokedAt nulo + last_used < 24h", () => {
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: fresh, hasRefreshToken: true }, NOW)
    ).toBe("ok");
  });

  it("retorna warn quando last_used > 24h", () => {
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: old, hasRefreshToken: true }, NOW)
    ).toBe("warn");
  });

  it("retorna warn quando last_used IS NULL + hasRefreshToken=true", () => {
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: null, hasRefreshToken: true }, NOW)
    ).toBe("warn");
  });

  it("limite exato 23h59 ok; 24h01 warn", () => {
    const t23h59 = new Date(NOW.getTime() - (23 * 60 + 59) * 60 * 1000);
    const t24h01 = new Date(NOW.getTime() - (24 * 60 + 1) * 60 * 1000);
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: t23h59, hasRefreshToken: true }, NOW)
    ).toBe("ok");
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: t24h01, hasRefreshToken: true }, NOW)
    ).toBe("warn");
  });

  it("relógio retrocedido (last_used > now) trata como ok, sem panic", () => {
    const future = new Date(NOW.getTime() + 10 * 60 * 1000);
    expect(
      computeGoogleLevel({ gcalRevokedAt: null, gcalLastUsedAt: future, hasRefreshToken: true }, NOW)
    ).toBe("ok");
  });
});

describe("computeWhatsAppLevel", () => {
  it("retorna unconnected quando waStatus E instanceName ambos null", () => {
    expect(
      computeWhatsAppLevel({ waStatus: null, instanceName: null, waLastInboundAt: null }, NOW)
    ).toBe("unconnected");
  });

  it("retorna error em close/disconnected/logout", () => {
    for (const s of ["close", "disconnected", "logout"]) {
      expect(
        computeWhatsAppLevel({ waStatus: s, instanceName: "abc", waLastInboundAt: null }, NOW)
      ).toBe("error");
    }
  });

  it("retorna warn em connecting/awaiting_qr_scan/pending/qr_pending", () => {
    for (const s of ["connecting", "awaiting_qr_scan", "pending", "qr_pending"]) {
      expect(
        computeWhatsAppLevel({ waStatus: s, instanceName: "abc", waLastInboundAt: null }, NOW)
      ).toBe("warn");
    }
  });

  it("retorna ok em connected/open + last_inbound < 24h", () => {
    for (const s of ["connected", "open"]) {
      expect(
        computeWhatsAppLevel({ waStatus: s, instanceName: "abc", waLastInboundAt: fresh }, NOW)
      ).toBe("ok");
    }
  });

  it("retorna warn em connected + last_inbound IS NULL", () => {
    expect(
      computeWhatsAppLevel({ waStatus: "connected", instanceName: "abc", waLastInboundAt: null }, NOW)
    ).toBe("warn");
  });

  it("retorna warn em connected + last_inbound > 24h", () => {
    expect(
      computeWhatsAppLevel({ waStatus: "connected", instanceName: "abc", waLastInboundAt: old }, NOW)
    ).toBe("warn");
  });

  it("strings desconhecidas tratam como warn defensivo, sem panic", () => {
    expect(
      computeWhatsAppLevel({ waStatus: "weird-state-xpto", instanceName: "abc", waLastInboundAt: null }, NOW)
    ).toBe("warn");
  });
});
