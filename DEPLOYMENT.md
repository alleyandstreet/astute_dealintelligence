# Astute Team Deployment Guide

This guide prepares Astute for shared team usage in production with PostgreSQL.

## Deployment model

- App: Next.js (`npm run start`)
- Database: PostgreSQL (managed provider or Docker service)
- Auth: NextAuth credentials
- Bootstrap: first super admin is auto-created from env vars

## 1. Production environment

Create `.env.production` from the template:

```bash
cp .env.production.example .env.production
```

Set at least:

- `NEXTAUTH_URL` (public HTTPS URL)
- `NEXTAUTH_SECRET` (long random string)
- `DATABASE_URL` (must start with `postgresql://` or `postgres://`)
- `GEMINI_API_KEY` (for AI features)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` (optional)

## 2. Preflight validation

Run:

```bash
npm run deploy:check
```

This verifies required env vars and confirms PostgreSQL URL format.

## 3. Option A (recommended): Docker Compose with PostgreSQL

Build and run:

```bash
docker compose up -d --build
```

What this does:

- starts a PostgreSQL service (`postgres:16-alpine`)
- builds and starts the app container
- runs DB sync (`prisma db push`) at startup
- ensures super admin exists from env values

Important:

- update the placeholder Postgres password in [docker-compose.yml](./docker-compose.yml) before running in production
- keep `DATABASE_URL` in `.env.production` aligned with your actual production database if you are not using the bundled Postgres service

Health endpoint:

- `GET /api/health`

## 4. Option B (recommended for Vercel): Vercel + managed PostgreSQL

1. Provision a PostgreSQL database (Neon, Supabase, RDS, Cloud SQL, etc.).
2. In Vercel project settings, set environment variables from `.env.production.example`.
3. Set `DATABASE_URL` to your managed Postgres URL.
4. Deploy the app.
5. On first boot, app startup runs `prisma db push` and admin bootstrap.

## 5. Option C: Bare-metal VM deployment

Requirements:

- Node.js 20+
- npm 10+
- reachable PostgreSQL instance

Steps:

```bash
npm ci
npm run build
npm run start:team
```

`start:team` runs:

1. deploy env check
2. Prisma schema sync
3. super-admin bootstrap
4. production server start

## 6. Team rollout checklist

1. Verify login works with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. Create all team users from Admin panel.
3. Share only the app URL (not server credentials).
4. Put the app behind HTTPS (Nginx/Cloudflare/Vercel/ALB).
5. Set up regular PostgreSQL backups.

## 7. Backups

- Managed Postgres: enable automated snapshots/backups with your provider.
- Self-hosted Docker Postgres: use `pg_dump` and archive dumps off-host.

Example backup command for Docker Postgres:

```bash
docker compose exec postgres pg_dump -U astute -d astute > astute-db-$(date +%F).sql
```

## 8. Troubleshooting

- Error: `DATABASE_URL must be a PostgreSQL URL`
  - Fix `.env.production` to use `postgresql://...` or `postgres://...`.
- Error: `Can't reach database server`
  - Check DB host/port/network access and credentials.
- No admin exists
  - Ensure `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set, then restart app.
