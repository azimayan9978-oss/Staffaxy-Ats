# syntax=docker/dockerfile:1
# Build context MUST be the repo root, e.g.:
#   docker build -f deploy/web.Dockerfile .
#
# This serves the built React app AND reverse-proxies /api/* to the
# api-server container, replicating what Replit's built-in router does
# (the frontend calls relative "/api/..." URLs and relies on same-origin
# routing — see lib/api-client-react/src/custom-fetch.ts).

ARG NODE_VERSION=24-bookworm-slim

FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm approve-builds esbuild

# BASE_PATH and PORT are required by vite.config.ts at build/dev time.
# PORT here only matters for the (unused) dev server, not the static build.
ENV BASE_PATH=/
ENV PORT=5173
ENV NODE_ENV=production
RUN pnpm --filter @workspace/ats run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/artifacts/ats/dist/public /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1
