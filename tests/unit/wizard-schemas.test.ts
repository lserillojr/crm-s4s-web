import { describe, expect, it } from "vitest";
import {
  whatsappStepSchema,
  instagramStepSchema,
  calendarStepSchema,
  kbStepSchema,
  confirmStepSchema,
} from "@/lib/wizard/schemas";

describe("whatsappStepSchema", () => {
  it("aceita número com DDD + 9 dígitos formatado", () => {
    const parsed = whatsappStepSchema.parse({
      phoneNumber: "(11) 99999-9999",
      provider: "evolution",
      hasExistingNumber: true,
    });
    expect(parsed.phoneNumber).toBe("(11) 99999-9999");
  });

  it("rejeita número com menos de 10 dígitos", () => {
    const result = whatsappStepSchema.safeParse({
      phoneNumber: "12345",
      provider: "evolution",
      hasExistingNumber: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita provider fora do enum", () => {
    const result = whatsappStepSchema.safeParse({
      phoneNumber: "11999999999",
      provider: "twilio" as never,
      hasExistingNumber: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("instagramStepSchema", () => {
  it("aceita pular Instagram (connect=false)", () => {
    const parsed = instagramStepSchema.parse({
      connect: false,
      instagramHandle: "",
    });
    expect(parsed.connect).toBe(false);
  });

  it("rejeita conectar sem informar handle", () => {
    const result = instagramStepSchema.safeParse({
      connect: true,
      instagramHandle: "",
    });
    expect(result.success).toBe(false);
  });

  it("aceita conectar com handle válido", () => {
    const parsed = instagramStepSchema.parse({
      connect: true,
      instagramHandle: "@meu_salao",
    });
    expect(parsed.instagramHandle).toBe("@meu_salao");
  });
});

describe("calendarStepSchema", () => {
  it("default São Paulo é válido", () => {
    const parsed = calendarStepSchema.parse({
      connect: true,
      timezone: "America/Sao_Paulo",
    });
    expect(parsed.timezone).toBe("America/Sao_Paulo");
  });

  it("rejeita timezone fora do BR", () => {
    const result = calendarStepSchema.safeParse({
      connect: true,
      timezone: "Europe/Lisbon" as never,
    });
    expect(result.success).toBe(false);
  });
});

describe("kbStepSchema", () => {
  it("rejeita 'about' com menos de 40 caracteres", () => {
    const result = kbStepSchema.safeParse({
      businessName: "Salão Maria",
      vertical: "beleza",
      about: "Salão de beleza no centro",
    });
    expect(result.success).toBe(false);
  });

  it("aceita descrição completa", () => {
    const parsed = kbStepSchema.parse({
      businessName: "Salão Maria",
      vertical: "beleza",
      about:
        "Salão de beleza no centro de São Paulo, atendo cortes femininos, escova e coloração. Horário comercial seg-sex 9h-19h.",
    });
    expect(parsed.businessName).toBe("Salão Maria");
  });

  it("rejeita vertical desconhecida", () => {
    const result = kbStepSchema.safeParse({
      businessName: "Test",
      vertical: "advocacia",
      about: "x".repeat(50),
    });
    expect(result.success).toBe(false);
  });
});

describe("confirmStepSchema", () => {
  it("exige aceitar termos", () => {
    const result = confirmStepSchema.safeParse({ acceptTerms: false });
    expect(result.success).toBe(false);
  });

  it("aceita com termos marcados", () => {
    const parsed = confirmStepSchema.parse({ acceptTerms: true });
    expect(parsed.acceptTerms).toBe(true);
  });
});
