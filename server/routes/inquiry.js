const router = require('express').Router();
const Inquiry = require('../models/Inquiry');

router.post('/', async (req, res) => {
    try {
        // FIXED: Now looks for 'firstName' and 'lastName' (lowercase)
        // matches exactly what your React form is sending.
        const combinedName = req.body.name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim();

        // Fallback
        const finalName = combinedName || "Anonymous User";

        const newInquiry = new Inquiry({
            propertyId: req.body.propertyId,
            propertyName: req.body.propertyName,
            
            name: finalName, 
            
            email: req.body.email,
            phone: req.body.phone,
            message: req.body.message,
            
            // If you want to save the date they selected in the calendar
            // Make sure your Model accepts a 'date' or 'appointmentDate' field!
            // For now, we save it in the message or a specific field if added to the model.
            message: `${req.body.message} (Requested Date: ${req.body.selectedDate})`
        });

        const savedInquiry = await newInquiry.save();
        res.status(200).json(savedInquiry);
    } catch (err) {
        console.error("❌ Inquiry Error:", err.message);
        res.status(500).json(err);
    }
});

module.exports = router;