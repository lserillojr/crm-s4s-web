import { z } from "zod";

// Etapa como o WF n8n devolve (espelha crm.stage do tenant).
export const funilStageSchema = z.object({
  s4s_role: z.string().nullable().optional(),
  name: z.string(),
  sequence: z.number().optional().default(0),
  is_won: z.boolean().optional().default(false),
});
export type FunilStage = z.infer<typeof funilStageSchema>;

export const funilGetResponseSchema = z.object({
  stages: z.array(funilStageSchema).default([]),
});
export type FunilGetResponse = z.infer<typeof funilGetResponseSchema>;

// Rename de label: o cliente manda só os papéis alterados. `.trim()` normaliza antes
// de validar (espelha o `.strip()` do serviço Odoo s4s_rename_stage).
export const renameItemSchema = z.object({
  role: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, "O nome da etapa não pode ser vazio")
    .max(64, "O nome da etapa é muito longo (máx. 64 caracteres)"),
});
export const renamePayloadSchema = z.object({
  renames: z.array(renameItemSchema).min(1),
});
export type RenamePayload = z.infer<typeof renamePayloadSchema>;

// Linha da tela: etapa + significado resolvido + flag de editável.
export type FunilStageRow = {
  role: string | null;
  meaning: string;
  name: string;
  sequence: number;
  isWon: boolean;
  editable: boolean;
};
