// Create missing source map referenced by html2pdf.js to avoid ENOENT during build (Vercel).
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../node_modules/html2pdf.js/dist/es6-promise.map');
try {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ version: 3, sources: [], names: [], mappings: '' }));
  }
} catch (_) {}
