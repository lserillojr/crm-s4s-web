import { beforeEach, describe, expect, it } from "vitest";
import { useWizardStore } from "@/lib/wizard/store";
import { wizardDefaults } from "@/lib/wizard/schemas";

describe("useWizardStore.hydrateFromServer", () => {
  beforeEach(() => useWizardStore.getState().reset());

  it("aplica data + furthestCompletedStep vindos do server", () => {
    useWizardStore.getState().hydrateFromServer({
      data: { ...wizardDefaults, kb: { businessName: "Salão X", vertical: "beleza", about: "y".repeat(40) } },
      furthestCompletedStep: "kb",
    });
    const s = useWizardStore.getState();
    expect(s.data.kb.businessName).toBe("Salão X");
    expect(s.furthestCompletedStep).toBe("kb");
  });

  it("merge raso: campos ausentes preservam o atual", () => {
    useWizardStore.getState().setWhatsapp({ phoneNumber: "11999998888", provider: "evolution", hasExistingNumber: true });
    useWizardStore.getState().hydrateFromServer({ furthestCompletedStep: "whatsapp" });
    const s = useWizardStore.getState();
    expect(s.data.whatsapp.phoneNumber).toBe("11999998888"); // preservado
    expect(s.furthestCompletedStep).toBe("whatsapp");
  });

  it("ignora payload vazio/undefined sem quebrar", () => {
    useWizardStore.getState().hydrateFromServer(undefined);
    useWizardStore.getState().hydrateFromServer({});
    expect(useWizardStore.getState().furthestCompletedStep).toBeNull();
  });

  it("step parcial do server não apaga campos-irmãos já no store", () => {
    useWizardStore.getState().setKb({ businessName: "Local", vertical: "beleza", about: "x".repeat(40) });
    useWizardStore.getState().hydrateFromServer({
      data: { ...wizardDefaults, kb: { businessName: "Server" } as never },
    });
    const s = useWizardStore.getState();
    expect(s.data.kb.businessName).toBe("Server");
    expect(s.data.kb.vertical).toBe("beleza"); // preservado
    expect(s.data.kb.about).toHaveLength(40); // preservado
  });
});
