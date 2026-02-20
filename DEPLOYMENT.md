# Deployment Guide - Astute v4.0

This document provides instructions on how to deploy Astute v4.0 to a production environment.

## Prerequisites
- **Node.js**: v18.x or higher
- **PostgreSQL**: A running instance (e.g., Supabase, RDS)
- **Environment Variables**: See `.env.example`

## 1. Environment Setup
Copy `.env.example` to `.env.production` (or your platform's environment settings) and fill in the required values.

```bash
cp .env.example .env.production
```

## 2. Install Dependencies
```bash
npm install
```

## 3. Database Migration
Ensure your database schema is up to date with Prisma.

```bash
npx prisma generate
npx prisma db push --force-reset
```
> [!WARNING]
> `db push --force-reset` will delete all data in your database. Use `npx prisma migrate deploy` for production updates if you have existing data and migrations.

## 4. Build for Production
```bash
npm run build
```

## 5. Start the Server
```bash
npm run start
```

## Deployment Platforms
### Vercel
1. Connect your GitHub repository to Vercel.
2. Add all environment variables from `.env.example` to the Vercel project settings.
3. Vercel will automatically detect Next.js and run the build command.

### Docker (Optional)
If you prefer Docker, you can create a `Dockerfile` based on the official Next.js template.

```dockerfile
# Example Dockerfile snippet
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
