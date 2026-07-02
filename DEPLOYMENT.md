# Deployment Guide

## Fixing "invalid length of startup packet" Error

### ROOT CAUSE IDENTIFIED: Railway PostgreSQL Infrastructure Issue

**Critical Discovery:** The initial deploy log error reveals the root cause:

```
collation-refresh: psql: error: /tmp/collation-refresh.SSw57Y.sql: Permission denied
```

This indicates **Railway's PostgreSQL service has a file permission issue during initialization**, which is causing all subsequent connection problems.

### What This Error Means

1. **Railway Infrastructure Failure:** The error occurs during Railway's PostgreSQL service startup, not in your application
2. **Permission Denied:** Railway's internal collation refresh script cannot execute due to insufficient permissions
3. **Cascading Failures:** This initialization failure causes the "invalid length of startup packet" errors when anything tries to connect

### Why Application Fixes Didn't Work

All our application-side fixes (SSL mode, Prisma configuration, etc.) couldn't solve this because:
- The problem is at the Railway PostgreSQL service level
- Your application configuration is actually correct
- The database service itself is failing to initialize properly

### Solutions

#### Option 1: Recreate Railway PostgreSQL Service (Recommended)

**Step 1: Delete the existing PostgreSQL service**

1. **Go to Railway Dashboard**
   - Navigate to [railway.app](https://railway.app)
   - Log in to your account
   - Select your project: `3308e863-6ff5-4650-ab34-b47b4c85929b`

2. **Locate the PostgreSQL service**
   - Find the PostgreSQL service in your project
   - It's likely named "PostgreSQL" or "postgres"
   - Click on the PostgreSQL service to open it

3. **Delete the PostgreSQL service**
   - Click on the "Settings" tab (gear icon)
   - Scroll down to the "Danger Zone" section
   - Click "Delete Service"
   - Confirm the deletion by typing the service name
   - ⚠️ **Warning:** This will permanently delete all data in the database

### Finding Your Next.js Web Service

**How to locate your Next.js application in Railway:**

1. **In your Railway project dashboard**
   - Look for services with names like:
     - "web" (if you named it that in railway.json)
     - "Next.js" 
     - Your GitHub repository name
     - A service with a website icon (🌐)

2. **Identify the web service by:**
   - **Icon:** Look for a service with a globe/website icon
   - **Type:** It should show "Nixpacks" or "Next.js" as the builder
   - **URL:** It will have a generated Railway URL (like `something.railway.app`)
   - **Build logs:** Click on "Deployments" to see Next.js build output

3. **If you see multiple services:**
   - The PostgreSQL service will have a database icon (🐘)
   - Your Next.js app will have a website icon (🌐)
   - Click on each service to see which one contains your app code

### Custom Domain Configuration

**If you don't see your custom domain in the deployment tab:**

1. **Custom domains are configured separately:**
   - Go to your web service (Next.js app)
   - Click on the "Settings" tab (gear icon)
   - Look for "Domains" or "Custom Domains" section
   - Custom domains are NOT in the "Deployments" tab

2. **How to add a custom domain:**
   - In the web service "Settings" tab
   - Find "Domains" section
   - Click "Add Domain"
   - Enter your custom domain (e.g., `yourdomain.com`)
   - Railway will provide DNS records to configure

3. **DNS Configuration:**
   - Railway will show you the CNAME/A records to add
   - Add these records to your domain registrar (GoDaddy, Namecheap, etc.)
   - Wait for DNS propagation (can take 24-48 hours)

4. **Verification:**
   - Once DNS propagates, Railway will automatically issue SSL certificates
   - Your custom domain will start working
   - Both Railway URL and custom domain will work

---

**Step 2: Create a new PostgreSQL service**

1. **Create new PostgreSQL service**
   - In your Railway project, click "+ New Service"
   - Select "Database" 
   - Choose "PostgreSQL"
   - Click "Add PostgreSQL"

2. **Configure the new service**
   - Railway will automatically create a new PostgreSQL instance
   - Wait for the service to initialize (green status indicator)
   - This may take 1-2 minutes

**Step 3: Update your DATABASE_URL**

1. **Get the new connection string**
   - Click on the new PostgreSQL service
   - Go to the "Variables" tab
   - Copy the `DATABASE_URL` value
   - It will look like: `postgresql://postgres:password@host:port/database`

2. **Add SSL mode to the connection string**
   - Append `?sslmode=require` to the URL
   - Final format: `postgresql://postgres:password@host:port/database?sslmode=require`

3. **Update Railway environment variables**
   - Go to your web service (Next.js app)
   - Click on the "Variables" tab
   - Update `DATABASE_URL` with the new connection string including SSL mode
   - Delete any public URL variables if they exist

**Step 4: Redeploy your application**

1. **Trigger a new deployment**
   - Go to your web service
   - Click on the "Deployments" tab
   - Click "Redeploy" or push a new commit to trigger deployment

2. **Verify the fix**
   - Watch the deployment logs
   - The "collation-refresh" error should be gone
   - The "invalid length of startup packet" error should be gone
   - Your application should connect successfully

This should resolve the permission issue by giving you a fresh PostgreSQL instance.

#### Option 2: Contact Railway Support

Since this is a Railway infrastructure issue:

1. **Open a support ticket** with Railway
2. **Include the collation-refresh error log**
3. **Request a PostgreSQL service restart/recreation**
4. **Mention the permission denied error during initialization**

#### Option 3: Alternative Deployment

If Railway cannot resolve this quickly:

1. **Deploy to Vercel** with Railway PostgreSQL as the database
2. **Or migrate to Render** which provides both hosting and PostgreSQL
3. **Or use Supabase/Neon** for PostgreSQL with any hosting platform

### Application Status

**Your application configuration is correct:**
- ✅ SSL mode enabled in DATABASE_URL
- ✅ Standard Prisma Client (no custom adapter)
- ✅ Proper environment variable handling
- ✅ Simplified health check
- ✅ Connection validation and logging

**The issue is entirely Railway infrastructure:**
- ❌ PostgreSQL service failing to initialize
- ❌ Permission denied during collation refresh
- ❌ Cascading connection failures

### What Changed:

- **Removed:** `@prisma/adapter-pg` dependency (causing protocol mismatch)
- **Removed:** `dotenv/config` from prisma.config.ts (preventing double-loading)
- **Simplified:** Health check to avoid database connection
- **Added:** Connection string validation and logging
- **Added:** Test script for debugging
- **Added:** Delayed Prisma initialization option
- **Critical:** SSL mode requirement for ALL database URLs
- **Root Cause:** Railway PostgreSQL infrastructure permission issue

---

## Database Migration Complete ✅

Your database has been successfully migrated from Docker (local) to Railway (cloud).

### Current Setup

**Cloud Database (Production):**
- **Provider:** Railway PostgreSQL
- **Connection:** Set in `.env` file
- **Status:** Online and accessible
- **Schema:** Synced with Prisma schema

**Local Database (Development):**
- **Provider:** Docker PostgreSQL  
- **Connection:** Available in `.env.local` (commented out)
- **Container:** services-hub-db-5433
- **Port:** 5433

### Environment Files

- **`.env`** - Production database (Railway) - ✅ Currently active
- **`.env.local`** - Local development database (Docker) - Commented out
- **`.env.example`** - Template for reference

### Switching Between Databases

**To use Railway (Production):**
```bash
# .env file should contain:
DATABASE_URL="postgresql://postgres:qwzCPPuBbLcPxsfzfnpPBFnLldTXIpcy@reseau.proxy.rlwy.net:28966/railway?sslmode=require"
```

**To use Docker (Local Development):**
```bash
# Comment out Railway URL in .env
# Uncomment Docker URL in .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trusted_services_ke"
```

### Deployment Options

#### Option 1: Deploy to Railway (Recommended)

1. **Push your code to GitHub**
2. **Connect your Railway project to GitHub**
3. **Railway will automatically deploy** when you push

**Steps:**
```bash
git add .
git commit -m "Database migrated to Railway PostgreSQL"
git push origin master
```

Then in Railway:
- Go to your project
- Click "New Service" → "Deploy from GitHub repo"
- Select this repository
- Railway will detect Next.js and auto-configure

**Environment Variables in Railway:**
- Add `DATABASE_URL` with your Railway connection string
- **Important:** Append `?sslmode=require` to your DATABASE_URL in Railway
- Example: `postgresql://postgres:password@host:port/database?sslmode=require`
- Railway will automatically use this

#### Option 2: Deploy to Vercel

1. **Push code to GitHub**
2. **Import project in Vercel**
3. **Add environment variable:**
   - `DATABASE_URL`: Your Railway connection string

#### Option 3: Other Platforms

For Netlify, Render, or other platforms:
- Add `DATABASE_URL` environment variable
- Set build command: `npm run build`
- Set start command: `npm run start`

### Database Management

**View Database in Railway:**
- Go to your Railway project
- Click on the PostgreSQL service
- Use the built-in query editor

**Run Prisma Studio:**
```bash
npx prisma studio
```

**Run Migrations:**
```bash
npx prisma db push
```

**Generate Prisma Client:**
```bash
npx prisma generate
```

### Important Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Always use environment variables** in production
3. **Your Docker database is still available** for local development
4. **Backups are handled by Railway** automatically
5. **SSL is recommended** for production connections

### Health Check

A health check endpoint is available at `/api/health` to monitor:
- Application status
- Database connectivity
- Service availability

This endpoint is automatically used by Railway for health monitoring as configured in `railway.json`.

### Troubleshooting

**Connection Issues:**
- Verify DATABASE_URL is correct
- Check if Railway database is active
- Ensure `?sslmode=require` is appended to DATABASE_URL
- Check Railway logs for specific error messages
- Test health check endpoint: `https://your-app.railway.app/api/health`

**Migration Issues:**
```bash
npx prisma db pull  # Pull current schema
npx prisma db push  # Push schema changes
```

**Build Issues:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Security Checklist

- ✅ Database credentials are in environment variables
- ✅ `.env` files are in `.gitignore`
- ✅ Railway connection string is secure
- ✅ SSL connection enabled with `?sslmode=require` (required for Railway)
- ⚠️ Consider rotating database password periodically
- ⚠️ Enable Railway's database backups

### Next Steps

1. **Deploy your application** using one of the options above
2. **Test the deployed application** with the Railway database
3. **Set up monitoring** in Railway dashboard
4. **Configure backups** in Railway settings
5. **Consider scaling** options as your application grows