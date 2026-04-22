const router = require('express').Router();
const News = require('../models/News');

// GET ALL NEWS
router.get('/', async (req, res) => {
    try {
        const articles = await News.find().sort({ createdAt: -1 }); // Newest first
        res.status(200).json(articles);
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST NEW ARTICLE (For later use)
router.post('/', async (req, res) => {
    try {
        const newArticle = new News(req.body);
        const savedArticle = await newArticle.save();
        res.status(200).json(savedArticle);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;