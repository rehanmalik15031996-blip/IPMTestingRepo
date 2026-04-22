# Vercel Deployment Guide

## Current Status

Your application is a **Create React App (CRA)**, not a Next.js app. However, Vercel can deploy React apps successfully with proper configuration.

## ✅ What's Already Configured

1. **`vercel.json`** - Created in the `client` folder with proper routing configuration
2. **Build scripts** - Your `package.json` already has the correct build command

## ⚠️ Required Changes Before Deployment

### 1. Update API URLs (CRITICAL)

Your application currently has hardcoded API URLs (`http://localhost:5000`) in multiple files. You need to:

**Option A: Quick Fix (Recommended for now)**
- Set environment variable `REACT_APP_API_URL` in Vercel dashboard
- Use find & replace in your codebase to replace `http://localhost:5000` with `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`

**Option B: Proper Refactoring (Better long-term)**
- Use the `api.js` config file I created (`client/src/config/api.js`)
- Replace all `axios.get('http://localhost:5000/...')` with `api.get('/...')`
- Import: `import api from '../config/api'` instead of `import axios from 'axios'`

### 2. Backend Deployment

Your Express.js backend needs to be deployed separately. Options:

**Option A: Vercel Serverless Functions**
- Convert Express routes to Vercel serverless functions
- Requires significant refactoring

**Option B: Deploy Backend Separately (Recommended)**
- Deploy to services like:
  - **Railway** (https://railway.app) - Easy MongoDB + Node.js deployment
  - **Render** (https://render.com) - Free tier available
  - **Heroku** - Paid option
  - **DigitalOcean App Platform**
  - **AWS/Google Cloud/Azure**

**Option C: MongoDB Atlas**
- Use MongoDB Atlas for database (cloud-hosted)
- Keep backend on a separate service

### 3. Environment Variables Setup

In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `REACT_APP_API_URL` = Your deployed backend URL (e.g., `https://your-backend.railway.app`)

## 📋 Deployment Steps

### Frontend (React App) Deployment

1. **Install Vercel CLI** (if deploying via CLI):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to client folder**:
   ```bash
   cd client
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   Or connect your GitHub repo to Vercel dashboard for automatic deployments.

4. **Set Environment Variables** in Vercel dashboard:
   - `REACT_APP_API_URL` = Your backend URL

### Backend Deployment (Example: Railway)

1. Create account on Railway.app
2. Create new project
3. Connect your GitHub repo
4. Set root directory to `server`
5. Add environment variables:
   - `MONGO_URI` = Your MongoDB connection string
   - `PORT` = 5000 (or let Railway assign)
6. Railway will auto-deploy

### Update Frontend API URL

After backend is deployed, update the `REACT_APP_API_URL` in Vercel to point to your backend URL.

## 🔧 Files Created/Modified

- ✅ `client/vercel.json` - Vercel configuration
- ✅ `client/.env.example` - Environment variable template
- ✅ `client/.vercelignore` - Files to ignore during deployment
- ✅ `client/src/config/api.js` - API configuration helper (optional, for refactoring)

## 🚀 Quick Start (Minimal Changes)

If you want to deploy quickly without refactoring all API calls:

1. **Deploy backend** to Railway/Render/etc.
2. **Deploy frontend** to Vercel
3. **In Vercel**, set environment variable: `REACT_APP_API_URL=https://your-backend-url.com`
4. **Use find & replace** in your codebase:
   - Find: `http://localhost:5000`
   - Replace: `process.env.REACT_APP_API_URL || 'http://localhost:5000'`
   - Or use: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`

## 📝 Notes

- Vercel automatically detects React apps and will use the build command from `package.json`
- The `vercel.json` ensures client-side routing works correctly
- Static assets are cached for performance
- Your backend must handle CORS for your Vercel domain

## 🔗 Useful Links

- [Vercel React Deployment](https://vercel.com/docs/frameworks/react)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Railway Deployment](https://docs.railway.app/)
- [Render Deployment](https://render.com/docs)

