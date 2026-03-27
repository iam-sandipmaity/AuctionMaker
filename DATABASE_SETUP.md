# Environment Setup Guide

This project reads environment variables from `f:\AuctionMaker\.env` for local development and from your hosting provider for production.

## Required Variables

These variables are used by the app:

```env
DATABASE_URL=""
DIRECT_URL=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL=""
NEXT_PUBLIC_SOCKET_URL=""
NODE_ENV=""
PORT=""
LOG_LEVEL=""
MEMORY_CHECK_INTERVAL=""
MEMORY_THRESHOLD_MB=""
SOCKET_TIMEOUT_ENABLED=""
```

## What Each Variable Does

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection used by the app |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection used by Prisma schema push and migrations |
| `NEXTAUTH_SECRET` | Yes | Secret used to sign auth tokens and sessions |
| `NEXTAUTH_URL` | Yes | Base URL of the app for NextAuth |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Public URL used by the frontend for socket and polling features |
| `NODE_ENV` | Yes | Runtime mode, usually `development` or `production` |
| `PORT` | Optional | App port; local default is usually `3000` |
| `LOG_LEVEL` | Optional | Logging level: `debug`, `info`, `warn`, `error`, or `none` |
| `MEMORY_CHECK_INTERVAL` | Optional | Memory monitor interval in milliseconds |
| `MEMORY_THRESHOLD_MB` | Optional | Memory warning threshold in MB |
| `SOCKET_TIMEOUT_ENABLED` | Optional | Enables inactive socket disconnect handling |

## Local Development Setup

1. Create or update `f:\AuctionMaker\.env`.
2. Add values like this:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USERNAME:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_SECRET="generate-a-random-secret-and-keep-it-stable"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
NODE_ENV="development"
PORT="3000"
LOG_LEVEL="info"
MEMORY_CHECK_INTERVAL="300000"
MEMORY_THRESHOLD_MB="400"
SOCKET_TIMEOUT_ENABLED="true"
```

3. Push the Prisma schema:

```bash
npm run db:push
```

4. Start the app:

```bash
npm run dev
```

## Neon Setup

Neon is the easiest hosted database option for this app.

1. Create a Neon project.
2. Copy both connection strings from Neon:
   - pooled URL for `DATABASE_URL`
   - direct URL for `DIRECT_URL`
3. Keep SSL enabled.
4. Put the pooled URL in `DATABASE_URL`.
5. Put the non-pooler URL in `DIRECT_URL`.

Example:

```env
DATABASE_URL="postgresql://user:password@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://user:password@ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## Production Setup

For production, set the same variables in your hosting provider instead of relying on a local `.env`.

Example production values:

```env
DATABASE_URL="postgresql://user:password@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://user:password@HOST.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_SECRET="use-a-long-random-secret"
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"
NODE_ENV="production"
PORT="3000"
LOG_LEVEL="warn"
MEMORY_CHECK_INTERVAL="300000"
MEMORY_THRESHOLD_MB="400"
SOCKET_TIMEOUT_ENABLED="true"
```

## How To Generate `NEXTAUTH_SECRET`

`NEXTAUTH_SECRET` is not provided by Neon or Prisma. You generate it yourself once and keep it stable.

PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
```

OpenSSL:

```bash
openssl rand -base64 32
```

Important:

- Do not change this secret on every restart.
- Reusing the same secret is correct.
- Changing it will invalidate existing login sessions.
- Rotate it only if you think it was exposed.

## Common Mistakes

- Using the pooled Neon URL for both `DATABASE_URL` and `DIRECT_URL`
- Changing `NEXTAUTH_SECRET` too often
- Setting `NEXTAUTH_URL` to localhost in production
- Forgetting to restart the app after changing `.env`
- Committing `.env` to git

## Troubleshooting

**Can't reach database server**

- Check `DATABASE_URL` and `DIRECT_URL`
- Make sure your database host, username, and password are correct
- Run `npm run db:push` again after fixing the URLs

**Prisma schema push fails**

- Confirm `DIRECT_URL` is set
- Make sure `DIRECT_URL` uses the direct, non-pooler connection string

**Login or session problems**

- Confirm `NEXTAUTH_SECRET` is present
- Confirm `NEXTAUTH_URL` matches the URL you are visiting

**Local changes are not picked up**

- Save `.env`
- Restart the dev server

## Security Notes

- `.env` is gitignored in this repo, but do not paste secrets into public places
- If database credentials were shared accidentally, rotate them in your database provider
- Use different secrets for development and production
