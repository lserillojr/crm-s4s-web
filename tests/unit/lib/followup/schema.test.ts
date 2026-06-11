import { describe, it, expect } from "vitest";
import {
  followupConfigSchema,
  followupConfigDefaults,
  INTENSITIES,
} from "@/lib/followup/schema";

describe("followupConfigSchema", () => {
  it("aceita a config default", () => {
    expect(followupConfigSchema.safeParse(followupConfigDefaults).success).toBe(
      true,
    );
  });

  it("default nasce desligado em intensidade padrao", () => {
    expect(followupConfigDefaults.enabled).toBe(false);
    expect(followupConfigDefaults.intensity).toBe("padrao");
    expect(followupConfigDefaults.nutricao_enabled).toBe(false);
  });

  it("rejeita intensidade fora do enum", () => {
    const bad = { ...followupConfigDefaults, intensity: "turbo" };
    expect(followupConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("expõe as 3 intensidades", () => {
    expect(INTENSITIES).toEqual(["suave", "padrao", "insistente"]);
  });
});
