# Dockerfile multi-stage para Next.js 14 standalone build.
#
# Stage 1: deps      - instala dependências pnpm (cacheable)
# Stage 2: builder   - compila o app + gera .next/standalone
# Stage 3: runner    - image final minimal Node 20-alpine, user não-root
#
# Build local (Linux/WSL/CI):
#   docker build -t crm-s4s-web:dev .
#
# Run local:
#   docker run --rm -p 3000:3000 --env-file .env.local crm-s4s-web:dev

FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL stub para o build (zod parse não falhar);
# em runtime o env real é injetado pelo Portainer/docker-compose.
ENV DATABASE_URL=postgres://stub:stub@localhost:5432/stub
# URLs públicas dos launchers SSO. Next inlineia NEXT_PUBLIC_* no bundle no build,
# então PRECISAM chegar como build-arg — injetar em runtime não tem efeito.
# Ausentes => sso-targets retorna null => botões desabilitados/omitidos.
ARG NEXT_PUBLIC_CHATWOOT_URL
ARG NEXT_PUBLIC_ODOO_URL
ENV NEXT_PUBLIC_CHATWOOT_URL=${NEXT_PUBLIC_CHATWOOT_URL}
ENV NEXT_PUBLIC_ODOO_URL=${NEXT_PUBLIC_ODOO_URL}
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia output standalone Next.js (server.js + node_modules mínimos)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Healthcheck: 200 OU 503 são respostas válidas do endpoint
# (DB pode estar degraded mas app está vivo); só status code != 2xx/5xx falha.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/healthz || exit 1

CMD ["node", "server.js"]
