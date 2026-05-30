import { describe, it, expect, vi } from "vitest";
import { getGlobalConfig, getRequiredGlobalConfig } from "@/lib/config/global-config";

function mockPool(rows: Array<{ value: string }>) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}

describe("getGlobalConfig", () => {
  it("retorna valor quando key existe", async () => {
    const pool = mockPool([{ value: "https://dev-evo.example.com" }]);
    // @ts-expect-error stub
    const v = await getGlobalConfig(pool, "evolution_api_base_url");
    expect(v).toBe("https://dev-evo.example.com");
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("global_config"), [
      "evolution_api_base_url",
    ]);
  });

  it("retorna null quando key não existe", async () => {
    const pool = mockPool([]);
    // @ts-expect-error stub
    const v = await getGlobalConfig(pool, "no_existe");
    expect(v).toBeNull();
  });

  it("getRequired throw quando key falta", async () => {
    const pool = mockPool([]);
    await expect(
      // @ts-expect-error stub
      getRequiredGlobalConfig(pool, "evolution_api_key")
    ).rejects.toThrow(/evolution_api_key/);
  });
});
