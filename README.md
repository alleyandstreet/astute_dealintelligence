This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

To deploy this application, follow these steps:

1.  **Environment Variables**: Ensure the following variables are set in your production environment:
    - `DATABASE_URL`: Path to your SQLite file (e.g., `file:/app/prisma/dev.db`).
    - `NEXTAUTH_URL`: The base URL of your site.
    - `NEXTAUTH_SECRET`: A secure secret for authentication.
    - `ANTHROPIC_API_KEY`: API key for Claude AI deal analysis.
    - `ADMIN_USERNAME`: Admin login username.
    - `ADMIN_PASSWORD`: Admin login password.

2.  **Build**: Run `npm run build` to generate the production optimized bundle.

3.  **Start**: Run `npm run start` to start the production server.

## Prisma

This project uses Prisma with SQLite. To initialize the database in a new environment, run:
```bash
npx prisma generate
npx prisma db push
```
