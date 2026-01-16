# ===========================================
# Stage 1: Builder
# ===========================================
FROM node:20-slim AS builder

WORKDIR /app

# Only copy package.json to get fresh native bindings
COPY package.json ./

# Fresh install to get correct native bindings for Linux
RUN yarn install

COPY . .

# Remove any cache that might have been copied
RUN rm -rf node_modules/.cache

# Build arguments with default values for CI/CD
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_DOMAIN_NAME=localhost

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_DOMAIN_NAME=$NEXT_PUBLIC_DOMAIN_NAME
ENV NEXT_TELEMETRY_DISABLED=1

# Disable Turbopack for build (fixes Google Fonts compatibility issue with Next.js 16)
ENV TURBOPACK=0
RUN yarn build

# ===========================================
# Stage 2: Production
# ===========================================
FROM node:20-slim AS runner

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

RUN apt-get update && apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4300

ENV NODE_ENV=production
ENV PORT=4300
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
