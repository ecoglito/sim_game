# Deploying Operation Black Knights to Vercel

## Prerequisites

1. A [Vercel account](https://vercel.com)
2. A [Google Cloud Console](https://console.cloud.google.com) project for OAuth

---

## Step 1: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (for production)
7. Copy your **Client ID** and **Client Secret**

---

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### Option B: Deploy via GitHub

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Vercel will auto-detect Next.js

---

## Step 3: Set Up Vercel Postgres

1. In your Vercel project, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Follow the setup wizard
4. Vercel will automatically add `DATABASE_URL` and `DIRECT_URL` to your environment

---

## Step 4: Configure Environment Variables

In your Vercel project settings, go to **Settings** → **Environment Variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` | NextAuth secret key |
| `AUTH_GOOGLE_ID` | Your Google OAuth Client ID | From step 1 |
| `AUTH_GOOGLE_SECRET` | Your Google OAuth Client Secret | From step 1 |
| `ADMIN_EMAIL` | `enzo@liquidlabs.inc` | Your admin email |

**Note:** `DATABASE_URL` and `DIRECT_URL` are automatically set by Vercel Postgres.

---

## Step 5: Initialize Database

After deploying, run the Prisma migrations:

```bash
# Using Vercel CLI
vercel env pull .env.local
npx prisma db push
```

Or in Vercel's **Deployments** → **Functions** → run:
```bash
prisma db push
```

---

## Step 6: Update Google OAuth Redirect URI

After deployment, update your Google OAuth settings with your production URL:

```
https://your-app.vercel.app/api/auth/callback/google
```

---

## Local Development

1. Create a `.env.local` file:

```env
# Database (get from Vercel Postgres or use local PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth
AUTH_SECRET="your-secret-here"
AUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Admin
ADMIN_EMAIL="enzo@liquidlabs.inc"
```

2. Push the database schema:
```bash
npx prisma db push
```

3. Run the dev server:
```bash
npm run dev
```

---

## Admin Access

1. Sign in with `enzo@liquidlabs.inc` via Google
2. You'll automatically be assigned the ADMIN role
3. Access the admin dashboard at `/admin`

---

## Creating Invites

1. Go to `/admin/invites`
2. Click **Create Invite**
3. Optionally specify an email (or leave blank for any email)
4. Set expiration
5. Share the invite link with candidates

---

## Troubleshooting

### "Access Denied" on sign-in
- Ensure you have a valid invite for the email
- Admin email should work without an invite

### Database errors
- Run `npx prisma db push` to sync schema
- Check Vercel Postgres connection strings

### OAuth errors
- Verify redirect URIs in Google Cloud Console
- Ensure `AUTH_URL` matches your deployment URL

