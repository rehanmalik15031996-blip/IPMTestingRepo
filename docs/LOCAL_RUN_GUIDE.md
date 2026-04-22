# 🚀 Local Development Guide

## Quick Start - Run Locally

### Prerequisites
- ✅ Node.js v18+ installed
- ✅ npm installed
- ✅ MongoDB Atlas connection (already configured)

---

## Step 1: Install Dependencies

Open terminal in the project root and run:

```bash
# Install root dependencies (if any)
npm install

# Install frontend dependencies
cd client
npm install

# Install backend dependencies (for local server - optional)
cd ../server
npm install

# Go back to root
cd ..
```

**Or use the convenience scripts:**
```bash
npm run install-client
npm run install-server
```

---

## Step 2: Environment Variables (Optional for Local Dev)

The MongoDB connection is already hardcoded in `api/_lib/mongodb.js`, but you can create a `.env` file in the root for local development:

**Create `.env` file in root directory:**
```env
MONGO_URI=mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-secret-key-here
REACT_APP_API_URL=http://localhost:5000
```

**Note:** For local development, the frontend can also connect directly to the deployed Vercel API (no backend needed locally).

---

## Step 3: Run the Application

### Option A: Frontend Only (Recommended - Uses Deployed Vercel API)

This is the easiest way - the frontend connects to your deployed Vercel API:

```bash
# Navigate to client directory
cd client

# Start development server
npm start
```

The app will open at **http://localhost:3000**

**Advantages:**
- ✅ No need to run backend locally
- ✅ Uses production API (Vercel)
- ✅ Faster startup
- ✅ Tests against real database

---

### Option B: Full Stack Locally (Frontend + Backend)

If you want to test backend changes locally:

**Terminal 1 - Backend Server:**
```bash
cd server
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
# Frontend runs on http://localhost:3000
```

**Note:** Make sure `REACT_APP_API_URL=http://localhost:5000` is set in your `.env` file or `client/src/config/api.js` will use it.

---

## Step 4: Test the Application

### 1. **Homepage**
- Visit: http://localhost:3000
- Should see video hero section
- Properties carousel
- Features grid
- Stats section

### 2. **Registration Flows**
- Click "Login" → "Create an account"
- Test each registration type:
  - **Agency Account** → 5-step wizard
  - **Individual Account → Agent → Sole Agent** → 4-step wizard
  - **Individual Account → Agent → Linked with Agency** → Simple form (shows modal)
  - **Individual Account → Buyer/Investor** → 5-step wizard with preferences
  - **Individual Account → Seller** → 4-step wizard (no preferences)

### 3. **Login**
- Use registered credentials
- Should redirect to dashboard

### 4. **Dashboards**
- Investor/Buyer → Portfolio dashboard
- Agency → Agency dashboard
- Agent → Agent dashboard

---

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution:**
```bash
# Make sure all dependencies are installed
cd client && npm install
cd ../server && npm install
```

### Issue: Port 3000 already in use
**Solution:**
```bash
# Use a different port
PORT=3001 npm start
```

### Issue: Port 5000 already in use (if running backend)
**Solution:**
- Kill the process using port 5000
- Or change port in `server/server.js`

### Issue: API calls failing
**Solution:**
- If using Option A (frontend only), make sure Vercel deployment is live
- If using Option B (full stack), make sure backend is running on port 5000
- Check `client/src/config/api.js` for correct API URL

### Issue: MongoDB connection errors
**Solution:**
- MongoDB Atlas connection is already configured
- Make sure your IP is whitelisted in MongoDB Atlas (or use 0.0.0.0/0 for development)
- Check connection string in `api/_lib/mongodb.js`

### Issue: Video not playing
**Solution:**
- Make sure video file exists at `client/public/video/hero section video.mp4`
- Check browser console for errors
- Video should autoplay (muted, loop)

---

## Development Tips

### Hot Reload
- Frontend: Changes auto-reload (React)
- Backend: Uses nodemon (auto-restarts on changes)

### API Testing
- Use browser DevTools → Network tab
- Check console for API calls
- Test registration endpoints directly

### Database Inspection
- Use MongoDB Atlas dashboard
- Check user collection after registration
- Verify data structure matches expectations

---

## Before Pushing to Git

### 1. **Test Everything**
- ✅ All registration flows work
- ✅ Login works
- ✅ Dashboards load
- ✅ No console errors
- ✅ No linter errors

### 2. **Check Git Status**
```bash
git status
```

### 3. **Review Changes**
```bash
git diff
```

### 4. **Add Changes**
```bash
git add .
```

### 5. **Commit**
```bash
git commit -m "Add new registration wizards and update backend endpoints"
```

### 6. **Push**
```bash
git push origin main
```

---

## Quick Commands Reference

```bash
# Install all dependencies
npm run install-client && npm run install-server

# Run frontend only (recommended)
cd client && npm start

# Run full stack locally
# Terminal 1:
cd server && npm start
# Terminal 2:
cd client && npm start

# Build for production
cd client && npm run build

# Check for errors
npm run lint  # (if configured)
```

---

## What to Test Before Pushing

- [ ] Homepage loads with video
- [ ] All registration wizards work
- [ ] File uploads work (logo/photo)
- [ ] OTP verification works (mocked)
- [ ] Subscription plan selection works
- [ ] Location detection works (for clients)
- [ ] Preferences selection works (for buyers/investors)
- [ ] Agency agent modal appears
- [ ] Login works after registration
- [ ] Dashboards load correctly
- [ ] No console errors
- [ ] No network errors

---

**Ready to test!** 🎉

Start with: `cd client && npm start`

