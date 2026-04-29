# Multi-stage build for Next.js 14
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

# --- deps ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile || pnpm install

# --- builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate
RUN pnpm build

# --- runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["pnpm", "start"]
