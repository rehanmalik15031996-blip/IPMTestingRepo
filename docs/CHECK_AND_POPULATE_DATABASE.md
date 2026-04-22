# Check and Populate Database

## How to Check if Database Has Data

### Method 1: Visit Your Website
1. Go to your deployed Vercel URL
2. Check these sections:
   - **Homepage**: "Premium Global Properties" section should show property cards
   - **News Section**: Should display news articles
   - **New Developments**: Should show development projects
   - If these show "Loading..." or are empty, the database needs seeding

### Method 2: Use Browser Console
1. Open your website
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Run this command:
```javascript
fetch('/api/properties')
  .then(res => res.json())
  .then(data => {
    console.log('Properties:', data.length);
    if (data.length === 0) {
      console.log('❌ Database is empty - needs seeding');
    } else {
      console.log('✅ Database has', data.length, 'properties');
    }
  });
```

## How to Populate the Database

### Option 1: Use the Seed Page (Easiest) ⭐
1. Go to: `https://your-vercel-url.vercel.app/seed`
2. Click the **"🌱 Seed Database Now"** button
3. Wait for the success message
4. You'll be redirected to the homepage
5. Refresh the page - you should now see all data!

### Option 2: Use Browser Console
1. Open your deployed website
2. Press F12 → Console tab
3. Run this command:
```javascript
fetch('/api/users?action=seed', { method: 'POST' })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Seeded:', data);
    alert('Database seeded! Refresh the page.');
    window.location.reload();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    alert('Error seeding database');
  });
```

### Option 3: Use Admin Panel
1. Log in as admin (or create an admin user first)
2. Go to `/admin`
3. Click the **"🌱 Seed Database"** button

## What Gets Seeded

### ✅ Properties (12 total)
- **6 Featured Properties** (shown on homepage):
  - Luxury Villa in Dubai Hills ($2.5M)
  - Penthouse in London Docklands (£1.85M)
  - Waterfront Apartment in Cape Town (R12.5M)
  - Luxury Estate in Hyde Park (£3.5M)
  - Beachfront Villa in Miami ($4.2M)
  - Luxury Apartment in Singapore (S$3.8M)
- **6 Additional Properties**:
  - Modern Loft in Downtown LA ($1.2M)
  - Investment Property in Dubai Marina ($950K)
  - Commercial Office Space in Manhattan ($8.5M)
  - Industrial Warehouse in Amsterdam (€2.1M)
  - Luxury Condo in Toronto (C$2.8M)
  - Retail Space in Paris (€4.5M)

**All properties include:**
- High-quality Unsplash images (1200px width)
- Detailed descriptions
- Complete specs (beds, baths, sqft)
- Proper listing types (Residential, Commercial, Industrial, Retail)
- Published status

### ✅ News Articles (6 total)
- Buying or Selling? Why Timing Alone Is No Longer the Deciding Factor
- From Listings to Intelligence: How AI Is Quietly Reshaping Property
- Dubai Real Estate: A Haven for Luxury Investment
- The Impact of Interest Rates on Global Property Markets
- London Property Market: Navigating Post-Brexit Realities
- Sustainable Living: The Future of Real Estate Development

**All articles include:**
- High-quality images
- Full content (not just descriptions)
- Categories, tags, read times
- Featured flags

### ✅ Developments (4 total)
- Dubai Hills Estate
- London Docklands
- Cape Town Waterfront
- Los Angeles Downtown Skyline Lofts

### ✅ Market Trends (4 total)
- South Africa (Good, +3.2%)
- Dubai (Excellent, +7.8%)
- London (Stable, +1.2%)
- Netherlands (Caution, -0.8%)

### ✅ Sample Users (3 total)
- **Admin**: `admin@ipm.com` / `admin123`
- **Investor**: `investor@ipm.com` / `investor123`
- **Agent**: `agent@ipm.com` / `agent123`

## After Seeding

1. **Homepage** should show:
   - 12 properties in the carousel
   - Featured properties highlighted
   - All images loading correctly

2. **News Page** should show:
   - 6 news articles
   - Featured articles at the top
   - All images and content visible

3. **New Developments** should show:
   - 4 development projects
   - All images and details

4. **Search** should return results for:
   - Property titles
   - Locations
   - Listing types

## Troubleshooting

### If seeding fails:
1. **Check MongoDB Atlas IP Whitelist**
   - Make sure `0.0.0.0/0` is whitelisted
   - See `FIX_MONGODB_ATLAS_CONNECTION.md`

2. **Check Vercel Environment Variables**
   - `MONGO_URI` must be set correctly
   - Check Vercel Dashboard → Settings → Environment Variables

3. **Check Vercel Function Logs**
   - Go to Vercel Dashboard → Your Project → Functions
   - Look for errors in the `/api/users` function

### If data doesn't appear after seeding:
1. **Hard refresh the page** (Ctrl+F5 or Cmd+Shift+R)
2. **Clear browser cache**
3. **Check browser console** for API errors
4. **Verify API routes** are returning 200 status codes

## Notes

- The seed function is **safe to run multiple times**
- It will **delete existing data** and re-seed
- Users are **not duplicated** (checks if they exist first)
- All images use **Unsplash CDN** (high quality, fast loading)

