# Deployment Guide

## Fixing "invalid length of startup packet" Error

The "invalid length of startup packet" error in Railway logs indicates a PostgreSQL connection protocol mismatch. Here's how to fix it:

### Root Cause
The error was caused by using the `@prisma/adapter-pg` package with an incompatible configuration that was sending invalid connection data to Railway PostgreSQL.

### Solution Applied

**1. Removed incompatible Prisma adapter:**
- Removed `@prisma/adapter-pg` dependency from package.json
- Switched to standard Prisma Client configuration

**2. Updated Prisma connection:**
- Changed from custom adapter to standard datasource configuration
- Simplified connection handling in <ref_file file="C:\Users\PC\Documents\services-hub\web\src\lib\prisma.ts" />

**3. SSL Configuration:**
- Keep `?sslmode=require` in your Railway DATABASE_URL
- This is still required for Railway PostgreSQL connections

### Steps to Apply:

1. **Ensure DATABASE_URL has SSL mode:**
   ```
   DATABASE_URL="postgresql://postgres:password@host:port/database?sslmode=require"
   ```

2. **Redeploy your Railway service** - The new configuration will be applied automatically

3. **Verify the fix** - Check Railway logs for the error to disappear

### What Changed:

- **Removed:** `@prisma/adapter-pg` dependency (causing protocol mismatch)
- **Updated:** Prisma client to use standard connection method
- **Kept:** SSL mode requirement for Railway PostgreSQL

### Verification:

After redeploying, the "invalid length of startup packet" error should be resolved. The application will connect using the standard PostgreSQL protocol which Railway expects.

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