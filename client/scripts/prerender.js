#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build-time pre-renderer for IPM marketing pages.
 *
 * Why this exists:
 *   The site is a Create React App SPA. Vercel rewrites every request to
 *   /index.html — the empty CRA shell — so Googlebot fetches a page with
 *   no real content. Search engines defer / skip the JS render for new,
 *   low-authority domains, which means our pages don't get indexed.
 *
 * What this does:
 *   After `react-scripts build`, we:
 *     1. Spin up a tiny static file server on `build/`
 *     2. Launch headless Chromium via Puppeteer
 *     3. For each public marketing route in package.json `prerender.routes`:
 *        - Navigate to the route
 *        - Wait until the page is "settled" (React rendered, network idle)
 *        - Snapshot the rendered DOM into `build/<route>/index.html`
 *     4. Tear down server + browser
 *
 *   At deploy time Vercel naturally serves the static `<route>/index.html`
 *   files when they exist (before applying the SPA fallback rewrite),
 *   so crawlers get fully-populated HTML on the first request, then JS
 *   loads and `hydrateRoot` takes over (see client/src/index.js).
 *
 * Failure mode:
 *   This script is best-effort. If pre-rendering errors out for a single
 *   route we log it and keep going; if the entire script crashes we
 *   exit 0 anyway so the Vercel build still succeeds with a working
 *   (un-prerendered) SPA. SEO is improved when this works; the app is
 *   not broken when it doesn't.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Load deps with clear, loud diagnostics so a missing dev-dependency on the
// build host (e.g. Vercel skipping devDeps when NODE_ENV=production) doesn't
// silently degrade the deploy to "no pre-render".
let handler;
let puppeteer;
try {
  handler = require('serve-handler');
} catch (e) {
  console.error('[prerender] FATAL: cannot require("serve-handler"). Is it installed?');
  console.error('[prerender]   Hint: ensure devDependencies are installed on the build host.');
  console.error('[prerender]   Hint: Vercel sets NODE_ENV=production which makes `npm install` skip devDeps.');
  console.error('[prerender]   Hint: use `npm install --include=dev` in the buildCommand.');
  console.error('[prerender]   Underlying error:', e.message);
  process.exit(1);
}
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('[prerender] FATAL: cannot require("puppeteer"). Is it installed?');
  console.error('[prerender]   Underlying error:', e.message);
  process.exit(1);
}

const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const PORT = Number(process.env.PRERENDER_PORT || 45678);
const NAV_TIMEOUT_MS = Number(process.env.PRERENDER_NAV_TIMEOUT_MS || 30000);
const SETTLE_DELAY_MS = Number(process.env.PRERENDER_SETTLE_DELAY_MS || 1500);

function loadRoutes() {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
  );
  const routes = pkg?.prerender?.routes || ['/'];
  return Array.from(new Set(routes.filter((r) => typeof r === 'string' && r.startsWith('/'))));
}

function serveEmptyShell(res, emptyShellHtml) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(emptyShellHtml);
}

function isAssetUrl(reqUrl) {
  // Anything with a file extension is treated as a static asset (JS, CSS,
  // images, fonts, etc.). Bare SPA routes like /our-services have no dot
  // in the last path segment.
  const urlPath = (reqUrl || '/').split('?')[0].split('#')[0];
  const lastSeg = urlPath.split('/').filter(Boolean).pop() || '';
  return lastSeg.includes('.');
}

function startServer(emptyShellHtml) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Serve real on-disk assets via serve-handler (correct mime types,
      // range support). Any SPA route — anything without a file extension
      // — gets the ORIGINAL empty CRA shell so each crawl hydrates from
      // a known-empty starting point. We never let the server hand out a
      // previously-snapshotted route, which would otherwise cause a noisy
      // (harmless) React hydration-mismatch warning per crawl.
      if (isAssetUrl(req.url)) {
        return handler(req, res, { public: BUILD_DIR });
      }
      return serveEmptyShell(res, emptyShellHtml);
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function snapshotRoute(browser, route) {
  const url = `http://127.0.0.1:${PORT}${route}`;
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    // Wait for React to commit at least one render into #root
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        return !!root && root.children.length > 0;
      },
      { timeout: NAV_TIMEOUT_MS }
    );
    // Brief settle delay to let lazy-loaded chunks and Helmet flush
    await new Promise((r) => setTimeout(r, SETTLE_DELAY_MS));

    const html = await page.content();

    // Write to build/<route>/index.html (root → build/index.html)
    const targetDir =
      route === '/' ? BUILD_DIR : path.join(BUILD_DIR, route.replace(/^\//, ''));
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');

    if (pageErrors.length > 0) {
      console.warn(`  ⚠️  ${route} rendered with JS errors: ${pageErrors.join(' | ')}`);
    }
    return { route, ok: true };
  } catch (err) {
    return { route, ok: false, error: err.message };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  if (!fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
    console.warn('[prerender] build/index.html missing — skipping pre-render.');
    return;
  }
  const routes = loadRoutes();
  console.log(`[prerender] pre-rendering ${routes.length} route(s) from build/`);

  // Capture the pristine empty shell BEFORE any snapshot overwrites it.
  // Subsequent SPA-fallback requests during the crawl will serve this so
  // each route hydrates from a known-empty starting point.
  const emptyShellHtml = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf8');

  let server;
  let browser;
  const results = [];
  try {
    server = await startServer(emptyShellHtml);
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const route of routes) {
      const result = await snapshotRoute(browser, route);
      results.push(result);
      console.log(`  ${result.ok ? '✅' : '❌'} ${route}${result.ok ? '' : ` — ${result.error}`}`);
    }
  } catch (err) {
    console.error('[prerender] fatal:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  console.log(`[prerender] done: ${ok}/${results.length} routes snapshotted${failed ? ` (${failed} failed)` : ''}`);
}

main().catch((err) => {
  console.error('');
  console.error('================================================================');
  console.error('[prerender] FATAL UNCAUGHT ERROR — pre-render did NOT run.');
  console.error('[prerender] The deploy will continue but every public marketing');
  console.error('[prerender] route will serve the empty CRA shell to crawlers.');
  console.error('[prerender]', err && err.stack ? err.stack : err);
  console.error('================================================================');
  console.error('');
  // Best-effort: never fail the deploy because of pre-render. Log loudly so
  // operators can still spot the problem in Vercel build logs.
  process.exit(0);
});
