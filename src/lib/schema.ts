/**
 * Drizzle schema — refletindo migrations CRM_S4S 001/011/012.
 *
 * Mantido manualmente em SP2 fase 1 (sem `pnpm db:pull` porque DATABASE_URL real
 * só fica disponível em DEV/PROD). Quando fase 2 estabilizar conexão, pode-se
 * regenerar via introspect — mas o mantemos manual pra evitar drift com
 * comments/checks Postgres que Drizzle não captura 100%.
 *
 * Cobertura fase 1: users, tenants, tenant_creation_audit (mínimo healthz +
 * dashboard placeholder). Outras tabelas (chatwoot_*, ai_*) entram conforme
 * features as consumirem.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  numeric,
  unique,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["owner", "agent", "viewer"]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  chatwootAccountId: integer("chatwoot_account_id").notNull().unique(),
  chatwootApiToken: text("chatwoot_api_token").notNull(),
  odooCompanyId: integer("odoo_company_id").notNull(),
  odooApiUrl: text("odoo_api_url").notNull(),
  odooApiKey: text("odoo_api_key").notNull(),
  evolutionInstance: varchar("evolution_instance", { length: 100 }),
  plan: varchar("plan", { length: 20 }).notNull().default("basic"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  authManagedBy: varchar("auth_managed_by", { length: 32 })
    .notNull()
    .default("legacy"),
  name: varchar("name", { length: 255 }),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "set null",
  }),
  role: varchar("role", { length: 32 }).notNull().default("owner"),
  phoneNumber: varchar("phone_number", { length: 32 }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  emailInvalid: boolean("email_invalid").notNull().default(false),
  onboardingState: jsonb("onboarding_state"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenantCreationAudit = pgTable("tenant_creation_audit", {
  idempotencyKey: uuid("idempotency_key").primaryKey(),
  requestHash: text("request_hash").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("in_progress"),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  chatwootAccountId: integer("chatwoot_account_id"),
  responsePayload: jsonb("response_payload"),
  completedSteps: text("completed_steps")
    .array()
    .notNull()
    .default([] as unknown as string[]),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const tenantProductCatalog = pgTable(
  "tenant_product_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 120 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priceBrl: numeric("price_brl", { precision: 12, scale: 2 }),
    category: varchar("category", { length: 80 }),
    attributes: jsonb("attributes").notNull().default({}),
    source: varchar("source", { length: 24 }).notNull().default("manual"),
    isActive: boolean("is_active").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("tenant_product_catalog_tenant_key").on(t.tenantId, t.key)],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TenantCreationAuditRow = typeof tenantCreationAudit.$inferSelect;
export type TenantProductCatalogRow = typeof tenantProductCatalog.$inferSelect;
export type NewTenantProductCatalog = typeof tenantProductCatalog.$inferInsert;
