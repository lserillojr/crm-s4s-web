import { describe, it, expect, vi } from "vitest";
import { getTenantReportsAccess } from "@/lib/db/reports-access";

function runner(rows: Array<Record<string, unknown>>) {
  return { query: vi.fn(async () => ({ rows, rowCount: rows.length })) };
}

describe("getTenantReportsAccess", () => {
  it("flag ligada + conta presente", async () => {
    const r = await getTenantReportsAccess(
      runner([{ reports_detailed_enabled: true, chatwoot_account_id: 2 }]),
      "t-1",
    );
    expect(r).toEqual({ reportsDetailedEnabled: true, chatwootAccountId: 2 });
  });
  it("flag desligada", async () => {
    const r = await getTenantReportsAccess(
      runner([{ reports_detailed_enabled: false, chatwoot_account_id: 2 }]),
      "t-1",
    );
    expect(r.reportsDetailedEnabled).toBe(false);
  });
  it("conta nula vira null", async () => {
    const r = await getTenantReportsAccess(
      runner([{ reports_detailed_enabled: true, chatwoot_account_id: null }]),
      "t-1",
    );
    expect(r.chatwootAccountId).toBeNull();
  });
  it("tenant inexistente → defaults seguros", async () => {
    const r = await getTenantReportsAccess(runner([]), "t-x");
    expect(r).toEqual({ reportsDetailedEnabled: false, chatwootAccountId: null });
  });
});
