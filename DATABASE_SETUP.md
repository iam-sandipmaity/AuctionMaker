# Database Setup Guide

## The Issue

The application is trying to connect to PostgreSQL at `localhost:5432`, but you don't have a local PostgreSQL server running.

## Quick Solution: Use a Free Cloud Database

I recommend using **Neon** - it's free, fast to set up, and perfect for development.

### Option 1: Neon (Recommended - Fastest Setup)

1. **Go to [Neon](https://neon.tech)**
   - Click "Sign Up" (free account)
   - Sign in with GitHub or email

2. **Create a New Project**
   - Click "Create Project"
   - Name it "AuctionMaker"
   - Select a region close to you
   - Click "Create Project"

3. **Copy the Connection String**
   - After creation, you'll see a connection string like:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   - Copy this entire string

4. **Update Your .env File**
   - Open `f:\AuctionMaker\.env`
   - Replace the DATABASE_URL line with your Neon connection string:
   ```env
   DATABASE_URL="postgresql://your-neon-connection-string-here"
   ```

5. **Push the Database Schema**
   - Open a new terminal in `f:\AuctionMaker`
   - Run: `npm run db:push`

6. **Restart the Dev Server**
   - Stop the current server (Ctrl+C in the terminal)
   - Run: `npm run dev`

---

### Option 2: Supabase

1. **Go to [Supabase](https://supabase.com)**
   - Click "Start your project"
   - Sign in with GitHub

2. **Create a New Project**
   - Click "New Project"
   - Name: "AuctionMaker"
   - Database Password: (create a strong password)
   - Region: Choose closest to you
   - Click "Create new project" (takes ~2 minutes)

3. **Get Connection String**
   - Go to Project Settings → Database
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password

4. **Update .env and Push Schema**
   - Same as steps 4-6 above

---

### Option 3: Local PostgreSQL (Advanced)

If you want to run PostgreSQL locally:

**Windows:**
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Install with default settings
3. Remember the password you set for the `postgres` user
4. Open pgAdmin or command line
5. Create a database: `CREATE DATABASE auction_db;`
6. Update .env:
   ```env
   DATABASE_URL="postgresql://postgres:your-password@localhost:5432/auction_db"
   ```
7. Run `npm run db:push`

---

## After Database Setup

Once you've updated the DATABASE_URL and pushed the schema:

1. **Refresh your browser** at http://localhost:3000
2. **Register a new account**
3. **Create an auction** from the Admin panel
4. **Test bidding!**

---

## Troubleshooting

**Error: "Can't reach database server"**
- Check that your DATABASE_URL is correct in `.env`
- Make sure you saved the `.env` file
- Restart the dev server after changing `.env`

**Error: "SSL connection required"**
- Add `?sslmode=require` to the end of your connection string

**Need help?**
- Let me know which option you chose and I can help troubleshoot!
