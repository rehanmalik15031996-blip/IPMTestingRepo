# Quick Deployment Checklist

## ✅ Ready for Vercel Deployment

Your React app is **almost ready** for Vercel. Here's what you need to know:

### Current Status
- ✅ `vercel.json` created - handles React Router correctly
- ✅ Build configuration is correct
- ⚠️ **API URLs need updating** - Currently hardcoded to `localhost:5000`

### Before Deploying

1. **Deploy your backend first** (Railway, Render, etc.)
   - Get your backend URL (e.g., `https://your-app.railway.app`)

2. **Update API URLs** in your code:
   - Option 1: Find & replace `http://localhost:5000` with `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`
   - Option 2: Use the `api.js` helper I created (requires refactoring imports)

3. **Deploy to Vercel**:
   ```bash
   cd client
   vercel
   ```

4. **Set Environment Variable in Vercel Dashboard**:
   - Variable: `REACT_APP_API_URL`
   - Value: Your deployed backend URL

### Important Notes

- **This is NOT a Next.js app** - It's Create React App, but Vercel supports it
- **Backend must be deployed separately** - Vercel is for frontend only
- **CORS must be configured** on your backend to allow requests from your Vercel domain

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

