FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global npm@10.9.9 --ignore-scripts

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Local Compose runs the development server and keeps legacy local auth available.
FROM deps AS development
COPY . .
ENV NODE_ENV=development
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# Run explicitly before a production rollout. Migration tooling stays out of runner.
FROM deps AS migrations
COPY drizzle ./drizzle
COPY src/db ./src/db
COPY drizzle.config.ts ./drizzle.config.ts
CMD ["npm", "run", "db:migrate"]

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_ENABLE_DEMO_MODE=false
# Next.js freezes public values at build time. Supply deployment values here;
# database, Clerk, Redis and cron credentials are runtime inputs only.
RUN node -e "if (!process.env.NEXT_PUBLIC_APP_URL || new URL(process.env.NEXT_PUBLIC_APP_URL).protocol !== 'https:' || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) throw new Error('HTTPS NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY build arguments are required')"
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
