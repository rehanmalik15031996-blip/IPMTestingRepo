const multer = require('multer');
const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const User = require('../../../../server/models/User');
const { runPropdataXlsxImport, runPropdataLeanXlsxImport } = require('../../../../server/services/propdataXlsxImport');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 2 } });

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.fields([{ name: 'residential', maxCount: 1 }, { name: 'leads', maxCount: 1 }])(req, res, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    await runMulter(req, res);
    const residentialFile = req.files?.residential?.[0] || null;
    const leadsFile = req.files?.leads?.[0] || null;
    if (!residentialFile && !leadsFile) return res.status(400).json({ message: 'Upload at least one file.' });
    const freshUser = await User.findById(agencyUser._id);
    if (!freshUser) return res.status(404).json({ message: 'Agency not found' });

    const replacePropdataLeads = String(req.body?.replacePropdataLeads || '').toLowerCase() === 'true';
    const maxRaw = req.body?.maxListings;
    const maxParsed = maxRaw === '' || maxRaw == null ? null : Number(maxRaw);
    const maxListings = Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : null;
    const leanImport = String(req.body?.leanImport || '').toLowerCase() === 'true';

    let summary;
    if (leanImport) {
      summary = await runPropdataLeanXlsxImport({
        agencyUser: freshUser,
        residentialBuffer: residentialFile ? residentialFile.buffer : null,
        maxListings,
      });
    } else {
      summary = await runPropdataXlsxImport({
        agencyUser: freshUser,
        residentialBuffer: residentialFile ? residentialFile.buffer : null,
        leadsBuffer: leadsFile ? leadsFile.buffer : null,
        replacePropdataLeads,
        maxListings,
      });
    }

    res.status(200).json({ success: true, done: true, summary, message: 'Import complete.' });
  } catch (err) {
    console.error('propdata-xlsx import:', err);
    res.status(500).json({ message: err.message || 'Import failed' });
  }
}

module.exports = handler;

/** @type {import('@vercel/node').VercelApiHandler['config']} */
module.exports.config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
