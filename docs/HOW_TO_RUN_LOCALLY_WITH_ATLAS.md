# 🚀 How to Run Locally with MongoDB Atlas

## The Problem
When running locally with `npm start`, the API calls need to connect to your MongoDB Atlas database. Since you're using Vercel serverless functions, you have a few options:

## Solution 1: Use Vercel CLI (Recommended) ⭐

This runs both frontend and API locally, connecting to MongoDB Atlas:

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Link Your Project
```bash
# In the project root
vercel link
```

### Step 4: Run Development Server
```bash
vercel dev
```

This will:
- ✅ Start frontend on `http://localhost:3000`
- ✅ Start API functions locally
- ✅ Connect to MongoDB Atlas (using environment variables)
- ✅ Hot reload on changes

**The app will automatically use your MongoDB Atlas data!**

---

## Solution 2: Point Frontend to Deployed Vercel API

If you just want to run the frontend locally but use the deployed API:

### Step 1: Update API Config
The API config is already set to use relative paths, but if you want to point to your deployed Vercel URL:

**Option A: Use Environment Variable**
Create `.env` file in `client/` directory:
```env
REACT_APP_API_URL=https://your-vercel-app.vercel.app
```

**Option B: Update `client/src/config/api.js`**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://your-vercel-app.vercel.app';
```

### Step 2: Run Frontend
```bash
cd client
npm start
```

**This will use your deployed Vercel API which connects to MongoDB Atlas.**

---

## Solution 3: Run Express Server Locally

If you want to run the full Express server locally:

### Step 1: Start Express Server
```bash
cd server
npm start
# Server runs on http://localhost:5000
```

### Step 2: Update API Config
Update `client/src/config/api.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'http://localhost:5000';
```

### Step 3: Start Frontend
```bash
cd client
npm start
```

**Note:** The Express server also connects to MongoDB Atlas (connection string is in `api/_lib/mongodb.js`).

---

## Verify MongoDB Atlas Connection

### Check Connection String
The MongoDB connection is configured in `api/_lib/mongodb.js`:
```javascript
const MONGO_URI = process.env.MONGO_URI || 
  'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';
```

### Verify Data Exists
1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Click "Browse Collections"
3. Check these collections:
   - `properties` - Should have property documents
   - `news` - Should have news articles
   - `developments` - Should have development projects
   - `users` - Should have user documents

### If Database is Empty
If collections are empty, seed the database:

**Option 1: Use Seed Page**
1. Go to: `http://localhost:3000/seed` (or your deployed URL)
2. Click "🌱 Seed Database Now"

**Option 2: Use API Endpoint**
```bash
# In browser console or Postman
POST http://localhost:3000/api/users?action=seed
# Or if using deployed API:
POST https://your-vercel-app.vercel.app/api/users?action=seed
```

---

## Troubleshooting

### Issue: "Network Error" or "CORS Error"
**Solution:**
- Make sure you're using the correct API URL
- If using Vercel dev, make sure `vercel dev` is running
- Check browser console for exact error

### Issue: "Cannot GET /api/properties"
**Solution:**
- If using `npm start` only, you need to either:
  - Use `vercel dev` instead
  - Point to deployed Vercel API
  - Run Express server on port 5000

### Issue: "MongoDB Connection Error"
**Solution:**
1. Check MongoDB Atlas Network Access:
   - Go to MongoDB Atlas → Network Access
   - Make sure `0.0.0.0/0` is whitelisted (or your IP)
2. Verify connection string is correct
3. Check Vercel environment variables (if using deployed API)

### Issue: Data Not Showing
**Solution:**
1. Open browser DevTools (F12) → Console
2. Check for API errors
3. Check Network tab to see if API calls are successful
4. Verify data exists in MongoDB Atlas
5. If empty, seed the database (see above)

---

## Quick Test

After starting the app, open browser console (F12) and run:

```javascript
// Test Properties API
fetch('/api/properties')
  .then(res => res.json())
  .then(data => {
    console.log('Properties:', data.length);
    if (data.length === 0) {
      console.log('⚠️ Database is empty - need to seed!');
    }
  });

// Test News API
fetch('/api/news')
  .then(res => res.json())
  .then(data => console.log('News:', data.length));

// Test Developments API
fetch('/api/developments')
  .then(res => res.json())
  .then(data => console.log('Developments:', data.length));
```

---

## Recommended Setup

**For Development:**
1. Use `vercel dev` (Solution 1) - Best experience
2. Or use deployed API with local frontend (Solution 2)

**For Production:**
- Deploy to Vercel
- Set environment variables in Vercel Dashboard
- Everything connects to MongoDB Atlas automatically

---

**Your MongoDB Atlas connection is already configured!** Just make sure you're using the right method to run the app locally.

