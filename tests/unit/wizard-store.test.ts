import { beforeEach, describe, expect, it } from "vitest";
import { useWizardStore } from "@/lib/wizard/store";
import {
  WIZARD_STEPS,
  WIZARD_STEP_SLUGS,
  nextStepSlug,
  prevStepSlug,
  stepIndex,
} from "@/lib/wizard/steps";

describe("wizard steps helpers", () => {
  it("WIZARD_STEPS tem exatamente 5 steps na ordem esperada", () => {
    expect(WIZARD_STEP_SLUGS).toEqual([
      "whatsapp",
      "instagram",
      "calendar",
      "kb",
      "confirm",
    ]);
  });

  it("stepIndex retorna índice 0-based correto", () => {
    expect(stepIndex("whatsapp")).toBe(0);
    expect(stepIndex("confirm")).toBe(4);
  });

  it("nextStepSlug retorna próximo / null no último", () => {
    expect(nextStepSlug("whatsapp")).toBe("instagram");
    expect(nextStepSlug("confirm")).toBeNull();
  });

  it("prevStepSlug retorna anterior / null no primeiro", () => {
    expect(prevStepSlug("instagram")).toBe("whatsapp");
    expect(prevStepSlug("whatsapp")).toBeNull();
  });
});

describe("useWizardStore", () => {
  beforeEach(() => {
    // reset() zera o estado E o storage (persist middleware grava o reset).
    // jsdom no Vitest 4 expõe window.localStorage sem métodos chamáveis;
    // o store usa fallback Map nesse caso, então não precisa clear() direto.
    useWizardStore.getState().reset();
  });

  it("defaults estão presentes ao inicializar", () => {
    const s = useWizardStore.getState();
    expect(s.data.whatsapp.provider).toBe("evolution");
    expect(s.data.calendar.timezone).toBe("America/Sao_Paulo");
    expect(s.furthestCompletedStep).toBeNull();
  });

  it("setWhatsapp persiste dado parcial", () => {
    useWizardStore.getState().setWhatsapp({
      phoneNumber: "11988887777",
      provider: "evolution",
      hasExistingNumber: true,
    });
    expect(useWizardStore.getState().data.whatsapp.phoneNumber).toBe(
      "11988887777"
    );
    // Não afeta outros steps
    expect(useWizardStore.getState().data.kb.businessName).toBe("");
  });

  it("markCompleted avança furthestCompletedStep", () => {
    useWizardStore.getState().markCompleted("whatsapp");
    expect(useWizardStore.getState().furthestCompletedStep).toBe("whatsapp");
    useWizardStore.getState().markCompleted("instagram");
    expect(useWizardStore.getState().furthestCompletedStep).toBe("instagram");
  });

  it("reset zera dado e progresso", () => {
    useWizardStore.getState().setWhatsapp({
      phoneNumber: "11988887777",
      provider: "cloud_api",
      hasExistingNumber: false,
    });
    useWizardStore.getState().markCompleted("kb");

    useWizardStore.getState().reset();

    const s = useWizardStore.getState();
    expect(s.data.whatsapp.phoneNumber).toBe("");
    expect(s.data.whatsapp.provider).toBe("evolution");
    expect(s.furthestCompletedStep).toBeNull();
  });
});

describe("useWizardStore.ensureOwner — isolamento por dono", () => {
  beforeEach(() => useWizardStore.getState().reset());

  it("reseta os dados quando o dono persistido difere da sessão atual", () => {
    // Conta A preenche o nome do negócio (fica no localStorage)
    useWizardStore.getState().ensureOwner("a@x.com");
    useWizardStore.getState().setKb({
      businessName: "Salão da A",
      vertical: "beleza",
      about: "a".repeat(40),
    });
    useWizardStore.getState().markCompleted("kb");

    // Conta B entra no MESMO navegador
    useWizardStore.getState().ensureOwner("b@y.com");

    const s = useWizardStore.getState();
    expect(s.data.kb.businessName).toBe(""); // não vazou o nome da conta A
    expect(s.furthestCompletedStep).toBeNull();
    expect(s.ownerEmail).toBe("b@y.com");
  });

  it("preserva os dados quando o mesmo dono retorna", () => {
    useWizardStore.getState().ensureOwner("a@x.com");
    useWizardStore.getState().setKb({
      businessName: "Salão da A",
      vertical: "beleza",
      about: "a".repeat(40),
    });

    useWizardStore.getState().ensureOwner("a@x.com"); // mesmo dono

    expect(useWizardStore.getState().data.kb.businessName).toBe("Salão da A");
    expect(useWizardStore.getState().ownerEmail).toBe("a@x.com");
  });

  it("reset() zera o ownerEmail", () => {
    useWizardStore.getState().ensureOwner("a@x.com");
    useWizardStore.getState().reset();
    expect(useWizardStore.getState().ownerEmail).toBeNull();
  });
});
