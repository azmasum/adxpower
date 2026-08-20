# AdxPower v1.0 — Live Server Deployment Guide

## Step 1: Get Free PostgreSQL Database (Neon.tech)

1. Go to https://neon.tech → Sign up (free)
2. Create a new project → name it `adxpower`
3. Copy the **Connection String** (looks like: `postgresql://neondb_owner:xxxxx@ep-xxx.us-east-2.aws.neon.tech/adxpower?sslmode=require`)

## Step 2: Deploy API Server (Render.com)

1. Go to https://render.com → Sign up (free)
2. Click **New** → **Web Service**
3. Connect your GitHub repo (push this project to GitHub first)
4. Settings:
   - **Name**: `adxpower-api`
   - **Runtime**: Node
   - **Build Command**:
     ```
     cd server && npm install && npx prisma generate && npx nest build
     ```
   - **Start Command**:
     ```
     cd server && npx prisma migrate deploy && node dist/main.js
     ```
   - **Plan**: Free

5. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste your Neon connection string) |
   | `PORT` | `3000` |
   | `CORS_ORIGINS` | `*` |
   | `PAYPAL_CLIENT_ID` | (your PayPal client ID) |
   | `PAYPAL_CLIENT_SECRET` | (your PayPal client secret) |
   | `PAYPAL_MODE` | `live` |
   | `ADMIN_API_KEY` | `your-admin-secret-key` |
   | `OFFLINE_SECRET` | `your-offline-activation-secret` |
   | `NODE_ENV` | `production` |

6. Click **Create Web Service**
7. Wait for deployment (2-3 minutes)
8. You'll get a URL like: `https://adxpower-api.onrender.com`

## Step 3: Verify Server

Open browser: `https://adxpower-api.onrender.com/health`
Should return: `{"status":"ok","timestamp":"..."}`

## Step 4: Configure Electron Client

1. Install AdxPower on user's PC
2. Open the app → Go to **System Settings**
3. In **Server Connection** section, enter:
   ```
   https://adxpower-api.onrender.com
   ```
4. Click **Save Settings**
5. The status should show **Connected**

## Notes

- Render free tier spins down after 15 min of inactivity. First request takes ~30s to wake up.
- Neon free tier: 0.5 GB storage, 24/7 compute (always-on).
- All user data (profiles, proxies, licenses) is stored in PostgreSQL on Neon.
- No local database needed on user's PC.
