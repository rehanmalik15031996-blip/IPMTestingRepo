# How to Seed the Database

## Quick Solution

Your database is empty, which is why you don't see any properties. Here's how to fix it:

### Option 1: Use the Seed Page (Easiest)

1. Go to: `https://your-vercel-url.vercel.app/seed`
2. Click the "🌱 Seed Database Now" button
3. Wait for the success message
4. You'll be redirected to the homepage
5. Refresh the page - you should now see properties, news, and developments!

### Option 2: Use Browser Console

1. Open your deployed website
2. Press F12 to open browser console
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
3. Click the "🌱 Seed Database" button

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

- Premium Global Properties section will show 6 properties
- News section will show 6 articles
- New Developments section will show 4 developments
- Search will return results
- Dashboard will show data for logged-in users

## Note

The seed endpoint is safe to run multiple times - it deletes old data and re-seeds, but won't duplicate users.

