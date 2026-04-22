# IPM Website

Real estate platform with client app, API, and server.

## Quick start

- **Setup:** See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
- **Run locally:** [docs/LOCAL_RUN_GUIDE.md](docs/LOCAL_RUN_GUIDE.md)
- **Deploy:** [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)

All other documentation is in the **[docs/](docs/)** folder.

## Deploy to www.internationalpropertymarket.com

1. **Push your final version** (you’re on `main` and it’s your final version, so you’re good).
2. **In Vercel:** Open your project → **Settings** → **Domains**.
3. **Add domain:** Enter `www.internationalpropertymarket.com` (and optionally `internationalpropertymarket.com` for the root) → **Add**.
4. **DNS at your registrar:**  
   - Vercel will show the required records (e.g. CNAME `www` → `cname.vercel-dns.com`, or A record for root).  
   - In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add exactly those records for `internationalpropertymarket.com`.
5. **Wait for DNS:** Propagation can take a few minutes up to 48 hours. Vercel will show a checkmark when the domain is verified.
6. **HTTPS:** Vercel issues a certificate automatically once the domain is verified.

After that, **www.internationalpropertymarket.com** will serve the latest deployment from the `main` branch.

**Invite links:** Agency invite emails must use the live domain, not the Vercel deployment URL. The app detects when the request comes from `internationalpropertymarket.com` and uses that for the link. To force it in all cases, set in Vercel → Settings → Environment Variables:
- `FRONTEND_ORIGIN` = `https://www.internationalpropertymarket.com`
