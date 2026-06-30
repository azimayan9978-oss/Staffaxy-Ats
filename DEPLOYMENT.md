# Deploying to a Linux server

This app was built on Replit, which provides things a plain server doesn't:
automatic routing of `/` to the frontend and `/api` to the backend on the
same domain, a managed Postgres instance, and env vars like `PORT` that get
injected per-service. The files under `deploy/` plus the root
`docker-compose.yml` replicate all of that with Docker.

## Architecture

- **`db`** — Postgres 16, with a persistent volume.
- **`api-server`** — the Express API (`artifacts/api-server`), built to a
  single self-contained file via esbuild and run with plain Node (no
  `node_modules` needed at runtime).
- **`web`** — the React frontend (`artifacts/ats`), built to static files
  and served by nginx, which also reverse-proxies `/api/*` to `api-server`.
  This matters: the frontend calls relative URLs like `/api/clients`
  (see `lib/api-client-react/src/custom-fetch.ts`), so it must be served
  from the same origin as the API — nginx does that here, the way Replit's
  router did in development.

## 1. Prerequisites

On the server: Docker Engine + the Docker Compose plugin.

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

## 2. Configure

```bash
git clone <your-repo-url> recruitment-hub
cd recruitment-hub
cp .env.example .env
```

Edit `.env` and set:
- `POSTGRES_PASSWORD` — a strong password
- `SESSION_SECRET` — `openssl rand -hex 32`
- `HTTP_PORT` — the port nginx binds on the host (default `80`)

## 3. Build and start the database first

```bash
docker compose up -d db
```

## 4. Push the database schema

The schema isn't created automatically — run the one-off migration job
(uses `drizzle-kit push`, same as `pnpm --filter db run push` in dev):

```bash
docker compose run --rm migrate
```

## 5. Build and start everything

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f api-server web
```

`web` will be reachable at `http://<server-ip>:${HTTP_PORT}` (port 80 by
default).

## 6. Create the first user

There's no signup UI — accounts are created via the API. The endpoint is
unauthenticated (see the security note below), so you can call it directly
from the server:

```bash
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"a-strong-password","role":"Admin"}'
```

Then log in at `http://<server-ip>/` with that email/password. Check
`lib/db/src/schema/users.ts` for the exact set of valid `role` values if the
above is rejected.

## Updating / redeploying

```bash
git pull
docker compose run --rm migrate   # only if the DB schema changed
docker compose up -d --build
```

## Backups

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Restore:

```bash
cat backup.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## HTTPS

Nothing here terminates TLS. Put a reverse proxy in front of the `web`
service (port `${HTTP_PORT}`) — e.g. [Caddy](https://caddyserver.com/) for
automatic Let's Encrypt certs, or your own nginx/Cloudflare setup. A minimal
Caddy example, run alongside this stack:

```caddyfile
your-domain.com {
    reverse_proxy localhost:80
}
```

If you do add TLS, also harden the session cookie in
`artifacts/api-server/src/app.ts`: set `cookie.secure: true` and
`app.set("trust proxy", 1)`, then rebuild `api-server`.

## Security notes (pre-existing in the app, worth fixing before real traffic)

These aren't deployment issues, just things this audit surfaced:

- **`POST /api/users` has no auth check** — anyone can create an account,
  including as `Admin`. Fine for bootstrapping the first user, but you
  should add an auth/role check to that route afterward.
- **Sessions use the default in-memory store** (`express-session`'s
  `MemoryStore`) — confirmed via a startup warning when testing the build.
  It leaks memory over time and won't survive a restart or work if you ever
  run more than one `api-server` replica. Swap in
  [`connect-pg-simple`](https://www.npmjs.com/package/connect-pg-simple)
  (you already have Postgres) before this sees real usage.
- **Password hashing is `sha256(password + static_salt)`**
  (`artifacts/api-server/src/routes/auth.ts`), not a slow/salted-per-user
  algorithm like bcrypt/argon2. Acceptable to ship a v1 with, but worth
  upgrading.
- **`SESSION_SECRET` has a hardcoded fallback** in `app.ts` if the env var
  is missing — the compose setup above forces you to set a real one, but if
  you run `api-server` outside this compose file, don't skip it.

## Running without Docker (alternative)

If you'd rather not use Docker: install Node 24 + pnpm 11 on the server,
`pnpm install && pnpm run build`, then run
`PORT=8080 NODE_ENV=production DATABASE_URL=... SESSION_SECRET=... node artifacts/api-server/dist/index.mjs`
under a process manager (pm2 or a systemd unit), and serve
`artifacts/ats/dist/public` as static files behind your own nginx config
(reuse `deploy/nginx.conf` as a starting point, just point `proxy_pass` at
`127.0.0.1:8080` instead of the Docker service name). You'd still need
Postgres installed/managed separately. Docker is the easier path and is
what `docker-compose.yml` here automates.
