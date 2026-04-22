// Consolidated contact/inquiry endpoints - handles appointments, meetings, and inquiries
// GET /api/contact?type=appointments - Get booked appointment dates
// GET /api/contact?type=meetings&date=...&agentName=... - Get booked meeting times
// POST /api/contact?type=meetings - Create meeting
// POST /api/contact?type=inquiry - Create inquiry
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Inquiry = require('../../server/models/Inquiry');
const Meeting = require('../../server/models/Meeting');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();
    const { type } = req.query;

    // GET appointments (booked dates)
    if (req.method === 'GET' && type === 'appointments') {
      const appointments = await Inquiry.find({}, 'selectedDate');
      const bookedDates = appointments
        .map(app => app.selectedDate)
        .filter(date => date != null);
      return res.status(200).json(bookedDates);
    }

    // GET meetings (booked times for a date/agent)
    if (req.method === 'GET' && type === 'meetings') {
      const { date, agentName } = req.query;
      const bookings = await Meeting.find({ date, agentName });
      const bookedTimes = bookings.map(b => b.time);
      return res.status(200).json(bookedTimes);
    }

    // POST meeting
    if (req.method === 'POST' && type === 'meetings') {
      const newMeeting = new Meeting(req.body);
      const savedMeeting = await newMeeting.save();
      return res.status(201).json(savedMeeting);
    }

    // POST inquiry
    if (req.method === 'POST' && type === 'inquiry') {
      const combinedName = req.body.name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim();
      const finalName = combinedName || "Anonymous User";
      const messageForDb = req.body.selectedDate
        ? `${req.body.message} (Requested Date: ${req.body.selectedDate})`
        : (req.body.message || '');
      // Bugs & Feedback form sends no email/phone; allow placeholders so validation passes
      const isBugsFeedback = (req.body.message || '').toString().startsWith('bugs &. feedback_');
      const email = (req.body.email || '').trim() || (isBugsFeedback ? 'bugs-feedback@noreply.ipm' : null);
      const phone = (req.body.phone || '').trim() || (isBugsFeedback ? '—' : null);
      if (!email || !phone) {
        return res.status(400).json({ message: 'Inquiry validation failed: email and phone are required.' });
      }
      const newInquiry = new Inquiry({
        propertyId: req.body.propertyId,
        propertyName: req.body.propertyName,
        name: finalName,
        email,
        phone,
        message: messageForDb
      });
      const savedInquiry = await newInquiry.save();

      const enquiryType = (req.body.enquiryType || '').trim();

      // Send email via Cloud Run (send-enquiry). Must allow unauthenticated invocations on the service, or this POST gets 403 at Google’s edge (no container logs).
      try {
        const sendEnquiryUrl = process.env.GOOGLE_SEND_ENQUIRY_URL || 'https://send-enquiry-541421913321.europe-west4.run.app';
        const emailPayload = {
          firstName: req.body.firstName || '',
          lastName: req.body.lastName || '',
          email: req.body.email || '',
          phone: req.body.phone || '',
          message: req.body.message || '',
          selectedDate: req.body.selectedDate || '',
          enquiryType: enquiryType || undefined
        };

        console.log('[contact] POST send-enquiry →', sendEnquiryUrl.replace(/^https:\/\/[^/]+/, 'https://…'));

        const emailResponse = await fetch(sendEnquiryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        const responseText = await emailResponse.text();
        let emailResult = {};
        try {
          emailResult = responseText ? JSON.parse(responseText) : {};
        } catch {
          console.warn('[contact] send-enquiry non-JSON response (status', emailResponse.status, '):', String(responseText).slice(0, 300));
        }

        if (emailResponse.ok && emailResult.success) {
          console.log('✅ [contact] send-enquiry OK — email pipeline ran');
        } else {
          console.warn('⚠️ [contact] send-enquiry HTTP', emailResponse.status, emailResult.error || emailResult.message || responseText?.slice(0, 120) || 'no body');
        }
      } catch (emailError) {
        console.error('❌ [contact] send-enquiry fetch failed (network/DNS/TLS):', emailError?.message || emailError);
      }
      
      return res.status(200).json(savedInquiry);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ message: err.message });
  }
};

