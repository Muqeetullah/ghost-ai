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

## Database

For Prisma Postgres, use the pooled runtime connection for `DATABASE_URL` and keep the direct hostname for CLI and migrations:

```bash
DATABASE_URL=postgres://USER:PASSWORD@pooled.db.prisma.io:5432/postgres?sslmode=require
DIRECT_URL=postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require
```

Ghost AI will also auto-upgrade a legacy direct `DATABASE_URL` (`db.prisma.io`) to the pooled runtime host in app code so the editor keeps using the safer application path while Prisma CLI continues to work with `DIRECT_URL`.

## Trigger.dev

Set the Trigger.dev project values in `.env.local`:

```bash
TRIGGER_PROJECT_REF=proj_your_project_ref
TRIGGER_SECRET_KEY=tr_dev_your_secret_key
```

Run the local Trigger.dev worker:

```bash
npm run trigger:dev
```

The initial task lives at `trigger/health-check.ts` and can be triggered from the Trigger.dev dashboard while AI generation workflows are being built.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
