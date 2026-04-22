const router = require('express').Router();
const Development = require('../models/Development');
const {
    listDevelopmentsForAgency,
    listDevelopmentsForAgent,
} = require('../utils/developmentsScopedList');

router.get('/', async (req, res) => {
    try {
        const agencyId = req.query.agencyId ? String(req.query.agencyId).trim() : null;
        const agentId = req.query.agentId ? String(req.query.agentId).trim() : null;

        if (agencyId) {
            const rows = await listDevelopmentsForAgency(agencyId);
            return res.status(200).json(rows);
        }
        if (agentId) {
            const rows = await listDevelopmentsForAgent(agentId);
            return res.status(200).json(rows);
        }

        const developments = await Development.find().sort({ createdAt: -1 }).limit(100).lean();
        return res.status(200).json(developments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const title = (body.title || '').trim();
        const location = (body.location || '').trim();
        const completion = (body.completion || '').trim();
        const priceStart = (body.priceStart || '').trim();
        const description = (body.description || '').trim();
        if (!title) return res.status(400).json({ message: 'Title is required' });
        if (!location) return res.status(400).json({ message: 'Location is required' });
        if (!completion) return res.status(400).json({ message: 'Completion is required' });
        if (!priceStart) return res.status(400).json({ message: 'Price start is required' });
        if (!description) return res.status(400).json({ message: 'Description is required' });
        const imageUrl =
            (body.imageUrl || '').trim() || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
        const doc = new Development({
            title,
            subtitle: (body.subtitle || '').trim() || undefined,
            location,
            completion,
            priceStart,
            yieldRange: (body.yieldRange || '').trim() || undefined,
            imageUrl,
            description,
            agentId: body.agentId || undefined,
            agencyId: body.agencyId || undefined,
            floorPlans: body.floorPlans || [],
            towers: body.towers || [],
            gallery: body.gallery || [],
        });
        const saved = await doc.save();
        return res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
