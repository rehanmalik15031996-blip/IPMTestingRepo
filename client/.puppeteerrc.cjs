/**
 * Puppeteer config — pin the Chromium cache to a project-local directory.
 *
 * Why: Puppeteer's default cache is ~/.cache/puppeteer. On some build hosts
 * (notably Vercel) the home directory is on a different mount than
 * node_modules, so Chromium downloaded at `npm install` time can be lost
 * by the time the prerender step runs. Pinning to client/.cache/puppeteer
 * keeps the browser binary co-located with node_modules.
 */
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
