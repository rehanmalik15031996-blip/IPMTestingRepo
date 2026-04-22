// Consolidated news route - handles /api/news and /api/news?id=...
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const News = require('../../server/models/News');
const { autoSeedIfEmpty } = require('../_lib/autoSeed');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        // GET single article (/api/news?id=...)
        const article = await News.findById(id);
        if (!article) {
          return res.status(404).json({ message: 'Article not found' });
        }
        return res.status(200).json(article);
      } else {
        // GET all articles (/api/news)
        // Auto-seed if database is empty (only on first request)
        const newsCount = await News.countDocuments();
        if (newsCount === 0) {
          console.log('🌱 Database is empty, auto-seeding...');
          try {
            await autoSeedIfEmpty();
            console.log('✅ Auto-seed completed');
          } catch (seedErr) {
            console.error('⚠️ Auto-seed failed (non-critical):', seedErr.message);
            // Continue even if seeding fails
          }
        }
        
        const articles = await News.find().sort({ createdAt: -1 });
        console.log(`✅ Found ${articles.length} news articles`);
        return res.status(200).json(articles);
      }
    }

    if (req.method === 'POST') {
      // POST new article
      const newArticle = new News(req.body);
      const savedArticle = await newArticle.save();
      return res.status(200).json(savedArticle);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('❌ News error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return res.status(500).json({ 
      message: err.message,
      error: 'Failed to fetch news'
    });
  }
};

