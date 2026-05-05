const mongoose = require('mongoose');
const router = require('express').Router();
const Property = require('../models/Property');
const { syncDealForProperty } = require('../utils/salesPipelineSync');

// CREATE NEW PROPERTY
router.post('/', async (req, res) => {
    try {
        // We pass the ENTIRE req.body to the Property model.
        // Because we updated the Schema, Mongoose will now look for 'listingType' and 'details' 
        // in req.body and save them automatically.
        const newProperty = new Property({
            ...req.body, // Spreads title, price, details, listingType, agentId, etc.
        });

        const savedProperty = await newProperty.save();
        res.status(200).json(savedProperty);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET ALL PROPERTIES (or single by ?id= for client compatibility)
router.get('/', async (req, res) => {
    try {
        const { search, id } = req.query;
        if (id) {
            const property = await Property.findById(id).populate('agentId', 'name email phone photo agencyName');
            if (!property) return res.status(404).json('Property not found');
            return res.status(200).json(property);
        }
        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } },
                    { listingType: { $regex: search, $options: 'i' } } // Now searchable by type!
                ]
            };
        }
        const properties = await Property.find(query).sort({ createdAt: -1 });
        res.status(200).json(properties);
    } catch (err) {
        res.status(500).json(err);
    }
});

/** Resolve imported listing ref (e.g. PropData Web Ref) + agency to a Property _id for CRM / lead links. */
router.get('/resolve-import-ref', async (req, res) => {
    try {
        const ref = String(req.query.ref || '').trim();
        const agencyId = String(req.query.agencyId || '').trim();
        if (!ref || !agencyId) {
            return res.status(400).json({ message: 'ref and agencyId are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(agencyId)) {
            return res.status(400).json({ message: 'Invalid agencyId' });
        }
        const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const property = await Property.findOne({
            importAgencyId: agencyId,
            importListingRef: { $regex: new RegExp(`^${esc}$`, 'i') },
        })
            .select('_id title')
            .lean();
        if (!property) {
            return res.status(404).json({ message: 'Property not found for this reference' });
        }
        return res.status(200).json({ _id: String(property._id), title: property.title });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// GET SINGLE PROPERTY
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('agentId', 'name email phone photo agencyName');
        res.status(200).json(property);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE PROPERTY
router.delete('/:id', async (req, res) => {
    try {
        await Property.findByIdAndDelete(req.params.id);
        res.status(200).json("Property has been deleted...");
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE PROPERTY
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        if (body.listingMetadata !== undefined) {
            console.log('[properties] PUT', id, 'setting listingMetadata (requestId:', body.listingMetadata?.requestId ?? 'n/a', ')');
        }
        // Capture the previous status BEFORE the update so we know if this PUT
        // is the one flipping the property to "Under Negotiation".
        const before = await Property.findById(id).select('status').lean();
        const prevStatus = before?.status || null;

        const updatedProperty = await Property.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true }
        );
        if (!updatedProperty) return res.status(404).json('Property not found');

        // Sales pipeline sync — fire-and-forget. Auto-creates / updates the deal
        // in the agency's salesDeals when status flips into or out of "Under Negotiation".
        syncDealForProperty(updatedProperty, prevStatus).catch((err) => {
            console.warn('[properties] sales sync failed:', err?.message || err);
        });

        res.status(200).json(updatedProperty);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
