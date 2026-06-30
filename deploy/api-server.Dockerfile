# syntax=docker/dockerfile:1
# Build context MUST be the repo root, e.g.:
#   docker build -f deploy/api-server.Dockerfile .

ARG NODE_VERSION=24-bookworm-slim

# ---------------------------------------------------------------------------
# base: shared pnpm setup
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# build: install full workspace + bundle the api-server with esbuild
# ---------------------------------------------------------------------------
FROM base AS build

# Copy the whole monorepo. pnpm needs every workspace package.json present to
# resolve against the lockfile, and esbuild needs the TS sources of the
# workspace packages (@workspace/db, @workspace/api-zod) it bundles in.
COPY . .

RUN pnpm install --frozen-lockfile

# pnpm's "ignored builds" supply-chain guard skips esbuild's postinstall
# (which fetches its platform binary) unless explicitly approved.
RUN pnpm approve-builds esbuild

RUN pnpm --filter @workspace/api-server run build

# ---------------------------------------------------------------------------
# runtime: nothing but the bundled output + Node. No node_modules needed —
# esbuild bundles all workspace + npm deps into dist/index.mjs.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/artifacts/api-server/dist ./dist

USER node
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
