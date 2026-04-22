/**
 * POST /api/bug-report — Bug reports & feedback with optional image attachment.
 * Saves to Inquiry collection and sends an email (with attachment) to the configured recipient.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const Inquiry = require('../models/Inquiry');

const BUG_REPORT_EMAIL = 'cornenegal@gmail.com';

const uploadsDir = path.join(__dirname, '..', 'uploads', 'bug-reports');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|bmp|svg|pdf/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        cb(ext && mime ? null : new Error('Only images and PDFs are allowed'), ext && mime);
    },
});

function buildTransporter() {
    const user = (process.env.BUG_REPORT_SMTP_USER || process.env.SMTP_USER || '').trim();
    const pass = (process.env.BUG_REPORT_SMTP_PASS || process.env.SMTP_PASS || '').trim();
    if (!user || !pass) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
}

async function sendViaCloudFunction(payload) {
    const url = process.env.GOOGLE_SEND_ENQUIRY_URL || 'https://send-enquiry-541421913321.europe-west4.run.app';
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Cloud Function returned ${resp.status}`);
    return resp;
}

router.post('/', upload.single('screenshot'), async (req, res) => {
    try {
        const { message, category, userEmail, userName } = req.body;
        const text = (message || '').trim();
        if (!text) return res.status(400).json({ message: 'A description is required.' });

        const catLabel = category || 'Bug Report';
        const filePath = req.file ? req.file.path : null;
        const fileName = req.file ? req.file.filename : null;

        const inquiry = new Inquiry({
            name: userName || 'Bug Reporter',
            email: userEmail || 'bugs-feedback@noreply.ipm',
            phone: '—',
            message: `[${catLabel}] ${text}${fileName ? `\n\nAttachment: ${fileName}` : ''}`,
        });
        await inquiry.save();

        let emailSent = false;

        const transporter = buildTransporter();
        if (transporter) {
            const mailOptions = {
                from: transporter.options.auth.user,
                to: BUG_REPORT_EMAIL,
                subject: `[IPM ${catLabel}] from ${userName || 'User'}`,
                html: `
                    <h2 style="color:#11575C;">IPM ${catLabel}</h2>
                    <p><strong>From:</strong> ${userName || 'Anonymous'} ${userEmail ? `(${userEmail})` : ''}</p>
                    <p><strong>Category:</strong> ${catLabel}</p>
                    <hr/>
                    <p style="white-space:pre-wrap;">${text}</p>
                    ${fileName ? `<p><strong>Attachment:</strong> ${fileName}</p>` : ''}
                    <hr/>
                    <p style="color:#999;font-size:12px;">Sent from IPM Bug Report system</p>
                `,
                attachments: filePath ? [{ filename: fileName, path: filePath }] : [],
            };
            try {
                await transporter.sendMail(mailOptions);
                emailSent = true;
                console.log(`✅ Bug report email sent to ${BUG_REPORT_EMAIL}`);
            } catch (emailErr) {
                console.error('❌ Nodemailer send failed:', emailErr.message);
            }
        }

        if (!emailSent) {
            try {
                await sendViaCloudFunction({
                    firstName: 'Bug',
                    lastName: 'Report',
                    email: userEmail || 'bugs-feedback@noreply.ipm',
                    phone: '',
                    message: `[${catLabel}] ${text}${fileName ? `\n\nAttachment saved on server: ${fileName}` : ''}`,
                    enquiryType: 'bug-report',
                });
                emailSent = true;
                console.log('✅ Bug report sent via Cloud Function');
            } catch (cfErr) {
                console.warn('⚠️ Cloud Function email fallback failed:', cfErr.message);
            }
        }

        res.json({
            success: true,
            emailSent,
            message: emailSent
                ? 'Bug report submitted and email sent. Thank you!'
                : 'Bug report saved. Email delivery will be retried.',
        });
    } catch (err) {
        console.error('Bug report error:', err);
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10 MB).' : err.message });
        }
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

module.exports = router;
