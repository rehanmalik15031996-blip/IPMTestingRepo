const mongoose = require('mongoose');

const monthlyDataPointSchema = new mongoose.Schema({
    month: String,  // e.g. "Jan", "Feb"
    value: Number   // index value (base 100 = start of period)
}, { _id: false });

const marketTrendSchema = new mongoose.Schema({
    country: String,
    status: String, // Excellent, Good, Stable, Caution
    color: String,  // #00c2cb, #2ecc71, #f1c40f, #e74c3c
    priceChange: String, // e.g., "+7.8%"
    monthlyData: [monthlyDataPointSchema] // actual monthly index (when set, charts use this instead of illustrative)
});
module.exports = mongoose.model('MarketTrend', marketTrendSchema);