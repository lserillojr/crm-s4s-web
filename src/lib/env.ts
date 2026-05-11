import { z } from "zod";

/**
 * Schema de validação das env vars do app.
 * Falha cedo no boot (Next.js server start) se algo crítico estiver faltando.
 *
 * Vars opcionais (Auth/N8N/Resend) preenchidas em SP2 fase 2+.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // DB (obrigatória; healthz pinga aqui)
  DATABASE_URL: z.string().url(),

  // Auth (SP2 fase 2 — Keycloak OIDC via Auth.js)
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_KEYCLOAK_ID: z.string().optional(),
  AUTH_KEYCLOAK_SECRET: z.string().optional(),
  AUTH_KEYCLOAK_ISSUER: z.string().url().optional(),

  // n8n API (Wizard consome /webhook/onboarding/provision em SP2 fase 2+)
  N8N_API_BASE_URL: z.string().url().optional(),
  N8N_PROVISION_API_KEY: z.string().optional(),

  // Resend (transactional emails — futuro)
  RESEND_API_KEY: z.string().optional(),
});

// Em test mode, permitir DATABASE_URL via setup file ao invés de exigir já.
// Outros ambientes parse com erro estourado pra falhar cedo.
function parseEnv() {
  if (process.env.NODE_ENV === "test") {
    return envSchema.partial({ DATABASE_URL: true }).parse(process.env);
  }
  return envSchema.parse(process.env);
}

export const env = parseEnv() as z.infer<typeof envSchema>;
export type Env = z.infer<typeof envSchema>;
