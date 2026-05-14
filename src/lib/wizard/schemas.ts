/**
 * Zod schemas dos 5 steps do wizard.
 *
 * Cada step exporta:
 * - schema: validação react-hook-form + parse antes de salvar no store
 * - defaults: estado inicial (vazio) que o form começa
 * - type: inferência de tipo pra TS
 *
 * Regras de validação são MEI-friendly: erros em pt-BR, mensagens curtas,
 * placeholders coerentes com discurso comercial ("número do WhatsApp",
 * não "phone number").
 */
import { z } from "zod";

/* ---------- Step 1: WhatsApp ---------- */

export const whatsappStepSchema = z.object({
  // Número aceita formatos BR: +5511999999999, 11999999999, (11) 99999-9999
  // Validamos contagem de dígitos — formatação é cosmética.
  phoneNumber: z
    .string()
    .min(1, "Informe seu número do WhatsApp")
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      },
      { message: "Número parece inválido (deve ter DDD + 8 ou 9 dígitos)" }
    ),
  provider: z.enum(["evolution", "cloud_api"], {
    message: "Escolha como conectar o WhatsApp",
  }),
  hasExistingNumber: z.boolean(),
});

export type WhatsappStepData = z.infer<typeof whatsappStepSchema>;

export const whatsappStepDefaults: WhatsappStepData = {
  phoneNumber: "",
  provider: "evolution",
  hasExistingNumber: true,
};

/* ---------- Step 2: Instagram ---------- */

export const instagramStepSchema = z
  .object({
    connect: z.boolean(),
    instagramHandle: z.string().optional(),
  })
  .refine(
    (data) => {
      // Se escolheu conectar, handle vira obrigatório (mínimo @ + 1 char)
      if (!data.connect) return true;
      return (data.instagramHandle ?? "").trim().length >= 2;
    },
    {
      message: "Informe o @ do seu Instagram",
      path: ["instagramHandle"],
    }
  );

export type InstagramStepData = z.infer<typeof instagramStepSchema>;

export const instagramStepDefaults: InstagramStepData = {
  connect: false,
  instagramHandle: "",
};

/* ---------- Step 3: Calendar ---------- */

export const calendarStepSchema = z.object({
  connect: z.boolean(),
  // Fuso: BR tem 4 timezones. Default São Paulo cobre ~85% MEI.
  timezone: z.enum([
    "America/Sao_Paulo",
    "America/Manaus",
    "America/Recife",
    "America/Belem",
  ]),
});

export type CalendarStepData = z.infer<typeof calendarStepSchema>;

export const calendarStepDefaults: CalendarStepData = {
  connect: true,
  timezone: "America/Sao_Paulo",
};

/* ---------- Step 4: KB / Seu negócio ---------- */

export const VERTICALS = [
  { value: "beleza", label: "Beleza (salão, manicure, estética)" },
  { value: "comercio_digital", label: "Comércio digital (loja online)" },
  { value: "artesanal", label: "Artesanal / Feito à mão" },
  { value: "ingles", label: "Escola / Ensino" },
  { value: "outro", label: "Outro" },
] as const;

export const kbStepSchema = z.object({
  businessName: z
    .string()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo (máx 80)"),
  vertical: z.enum(
    VERTICALS.map((v) => v.value) as [string, ...string[]],
    { message: "Escolha um setor" }
  ),
  about: z
    .string()
    .min(40, "Descreva seu negócio em ao menos 40 caracteres — isso fica na 'identidade' da IA")
    .max(2000, "Máximo 2000 caracteres (você edita depois no painel)"),
});

export type KbStepData = z.infer<typeof kbStepSchema>;

export const kbStepDefaults: KbStepData = {
  businessName: "",
  vertical: "beleza",
  about: "",
};

/* ---------- Step 5: Confirm ---------- */

export const confirmStepSchema = z.object({
  acceptTerms: z
    .boolean()
    .refine((v) => v, { message: "Aceite os termos pra ativar sua conta" }),
});

export type ConfirmStepData = z.infer<typeof confirmStepSchema>;

export const confirmStepDefaults: ConfirmStepData = {
  acceptTerms: false,
};

/* ---------- Agregado ---------- */

export type WizardData = {
  whatsapp: Partial<WhatsappStepData>;
  instagram: Partial<InstagramStepData>;
  calendar: Partial<CalendarStepData>;
  kb: Partial<KbStepData>;
  confirm: Partial<ConfirmStepData>;
};

export const wizardDefaults: WizardData = {
  whatsapp: whatsappStepDefaults,
  instagram: instagramStepDefaults,
  calendar: calendarStepDefaults,
  kb: kbStepDefaults,
  confirm: confirmStepDefaults,
};
