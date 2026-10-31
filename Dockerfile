# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

# ---------- deps: install everything (including devDependencies) for the build ----------
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

# ---------- build: build the frontend (Vite) and backend (Bun.build) ----------
FROM deps AS build
COPY . .
RUN bun run --cwd apps/web build
# scripts/build.ts inlines every dependency (and packages/shared) into dist/, so the runner
# needs no node_modules at all.
RUN bun run --cwd apps/api build

# ---------- runner: minimal final image ----------
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Preserve the apps/api + apps/web sibling structure — server.ts and migrate.ts resolve relative
# paths from cwd (not __dirname), so this structure must match the relative depth used in
# development (see the comments in app.ts/migrate.ts).
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
EXPOSE 3000

CMD ["sh", "-c", "bun dist/migrate.js && bun dist/server.js"]
