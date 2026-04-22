# Vercel Function Limit Solution

## Problem
Vercel Hobby plan allows only **12 serverless functions**, but we have **31 API routes**.

## Solution: Consolidate Routes

We need to consolidate routes using Vercel's catch-all routes (`[...slug].js`) and combine related operations.

### Strategy:
1. **Delete old route files** after creating consolidated versions
2. **Use catch-all routes** for routes with dynamic segments
3. **Combine related operations** into single files

### Files to Delete (after consolidation):
- `api/news/index.js` → Use `api/news/[...slug].js` instead
- `api/news/[id].js` → Use `api/news/[...slug].js` instead
- `api/properties/index.js` → Use `api/properties/[...slug].js` instead  
- `api/properties/[id].js` → Use `api/properties/[...slug].js` instead

### Remaining Functions (Target: 12 or fewer):

1. ✅ `api/auth/login.js`
2. ✅ `api/auth/register.js`
3. ✅ `api/news/[...slug].js` (consolidates 2 routes)
4. ✅ `api/properties/[...slug].js` (consolidates 2 routes)
5. ✅ `api/developments/index.js`
6. ✅ `api/inquiry/index.js`
7. ✅ `api/meetings/index.js`
8. ✅ `api/appointments/index.js`
9. ✅ `api/users/index.js` (or consolidate more user routes)
10. ✅ `api/users/[id].js` (or consolidate)
11. ✅ `api/vault/upload.js`
12. ✅ `api/vault/[userId].js`

**Note:** We still have many user sub-routes. We may need to consolidate more or consider upgrading to Pro plan.

### Alternative: Upgrade to Vercel Pro
- **Pro Plan:** $20/month - Unlimited serverless functions
- **Team Plan:** $20/user/month - Unlimited functions + team features

### Next Steps:
1. Test the consolidated routes work correctly
2. Delete old route files
3. Update frontend if any API paths changed
4. Redeploy

