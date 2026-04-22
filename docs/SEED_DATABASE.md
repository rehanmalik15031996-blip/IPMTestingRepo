# How to Seed the Database

## Problem
The database is empty, so the website shows "Loading" but no data appears.

## Solution
Call the seed API endpoint to populate the database with initial data.

## Method 1: Using Browser Console (Easiest)

1. Open your deployed website on Vercel
2. Open browser console (F12)
3. Run this command:
```javascript
fetch('/api/seed', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log('✅ Seeded:', data))
  .catch(err => console.error('❌ Error:', err));
```

## Method 2: Using curl (Terminal)

```bash
curl -X POST https://your-vercel-url.vercel.app/api/seed
```

## Method 3: Create a Temporary Admin Button

Add this to your Admin page temporarily to seed the database.

## What Gets Seeded

- **4 Market Trends** (Dubai, London, South Africa, Netherlands)
- **6 News Articles** (various categories)
- **4 Developments** (Dubai Hills, London Docklands, Cape Town, LA)
- **6 Properties** (various locations and types)
- **3 Sample Users**:
  - Admin: `admin@ipm.com` / `admin123`
  - Investor: `investor@ipm.com` / `investor123`
  - Agent: `agent@ipm.com` / `agent123`

## After Seeding

1. Refresh the website
2. All sections should now show data:
   - Premium Global Properties
   - News Section
   - New Developments
   - Dashboard data

## Note

The seed endpoint can be called multiple times - it will:
- Delete existing data and re-seed
- Only create users if they don't exist (won't duplicate)

