# Astute v4.0

Private equity deal intelligence and team CRM platform.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

- `DATABASE_URL` (PostgreSQL URL: must start with `postgresql://` or `postgres://`)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GEMINI_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Use `.env.example` for local defaults and `.env.production.example` for team deployment.

## Production scripts

- `npm run deploy:check` - validates deployment env
- `npm run db:push` - syncs Prisma schema
- `npm run admin:ensure` - creates or upgrades super admin from env
- `npm run start:team` - full production start pipeline

## Deployment

Full runbook: [DEPLOYMENT.md](./DEPLOYMENT.md)

Quick Docker launch:

```bash
cp .env.production.example .env.production
# Set a strong DB password in both .env.production and docker-compose.yml
docker compose up -d --build
```

Health check:

- `GET /api/health`
