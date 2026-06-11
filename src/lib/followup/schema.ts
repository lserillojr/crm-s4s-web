/**
 * Contrato do acompanhamento automático (tenant_followup_config). Espelha a
 * tabela do backend. O BFF /api/followup-config valida com este schema nos dois
 * sentidos; a UI usa os defaults quando o tenant ainda não tem linha.
 */
import { z } from "zod";

export const INTENSITIES = ["suave", "padrao", "insistente"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const INTENSITY_LABELS: Record<Intensity, { titulo: string; desc: string }> = {
  suave: { titulo: "Suave", desc: "Poucos lembretes, bem espaçados" },
  padrao: { titulo: "Padrão", desc: "Equilíbrio recomendado" },
  insistente: { titulo: "Insistente", desc: "Mais lembretes para não perder o cliente" },
};

const mensagensSchema = z
  .object({
    followup: z.array(z.string()).optional(),
    noshow: z.array(z.string()).optional(),
    nutricao: z.array(z.string()).optional(),
  })
  .nullable();

export const followupConfigSchema = z.object({
  enabled: z.boolean(),
  intensity: z.enum(INTENSITIES),
  followup_enabled: z.boolean(),
  noshow_enabled: z.boolean(),
  nutricao_enabled: z.boolean(),
  respeitar_horario: z.boolean(),
  mensagens: mensagensSchema,
});

export type FollowupConfig = z.infer<typeof followupConfigSchema>;

export const followupConfigDefaults: FollowupConfig = {
  enabled: false,
  intensity: "padrao",
  followup_enabled: true,
  noshow_enabled: true,
  nutricao_enabled: false,
  respeitar_horario: true,
  mensagens: null,
};
