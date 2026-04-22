# How to Seed Database Directly (If /seed page doesn't work)

If you're getting a 404 error on `/seed`, you can seed the database directly using the API endpoint.

## Method 1: Browser Console (Easiest)

1. Go to your Vercel domain homepage: `https://your-domain.vercel.app`
2. Open Browser Console (Press F12 or Right-click → Inspect → Console)
3. Paste this code and press Enter:

```javascript
fetch('/api/users?action=seed', { method: 'POST' })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Seed Result:', data);
    if (data.success) {
      alert('✅ Database seeded successfully!\n\n' + 
        'Properties: ' + data.data.properties + '\n' +
        'News: ' + data.data.news + '\n' +
        'Developments: ' + data.data.developments + '\n' +
        'Users: ' + data.data.users);
      window.location.reload();
    } else {
      alert('❌ Error: ' + data.message);
    }
  })
  .catch(err => {
    console.error('❌ Error:', err);
    alert('❌ Failed to seed: ' + err.message);
  });
```

4. Wait for the success message
5. Refresh the page

## Method 2: Using curl (Terminal)

```bash
curl -X POST https://your-domain.vercel.app/api/users?action=seed
```

## Method 3: Using Postman or API Client

- **URL:** `https://your-domain.vercel.app/api/users?action=seed`
- **Method:** POST
- **Headers:** None required

## What Gets Seeded

- ✅ 12 Properties (all Published)
- ✅ 6 News Articles
- ✅ 4 Developments
- ✅ 4 Market Trends
- ✅ 3 Sample Users (Admin, Investor, Agent)

## Sample Login Credentials (After Seeding)

- **Admin:** admin@ipm.com / admin123
- **Investor:** investor@ipm.com / investor123
- **Agent:** agent@ipm.com / agent123

## Troubleshooting

If you get an error:
1. Check Vercel Function Logs in your dashboard
2. Verify MongoDB connection is working
3. Make sure `MONGO_URI` environment variable is set in Vercel
4. Check that your IP is whitelisted in MongoDB Atlas (or use 0.0.0.0/0)

