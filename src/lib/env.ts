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
  N8N_AI_SERVICE_TOKEN: z.string().optional(),

  // Resend (transactional emails — futuro)
  RESEND_API_KEY: z.string().optional(),

  // Push (Onda 1/B — app nativo)
  EXPO_ACCESS_TOKEN: z.string().optional(),   // recomendado p/ rate-limit/receipts Expo
  PUSH_WEBHOOK_SECRET: z.string().optional(), // segredo do WF17 -> /api/push/handoff
});

/**
 * Parse de uma fonte arbitrária de env. Vars opcionais que chegam como string
 * vazia (ex: `${N8N_API_BASE_URL:-}` no compose entrega `""`) viram `undefined`
 * antes do zod — senão `z.string().url()`/`.min()` falham em `""` e quebram o
 * boot/rotas (ZodError silencioso). Exportada pra teste.
 */
export function parseEnvFrom(source: Record<string, unknown>) {
  const cleaned = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  // Em test mode, permitir DATABASE_URL via setup file ao invés de exigir já.
  if (cleaned.NODE_ENV === "test") {
    return envSchema.partial({ DATABASE_URL: true }).parse(cleaned);
  }
  return envSchema.parse(cleaned);
}

export const env = parseEnvFrom(process.env) as z.infer<typeof envSchema>;
export type Env = z.infer<typeof envSchema>;
