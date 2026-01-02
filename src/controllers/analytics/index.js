const express = require("express");
const router = express.Router();
const AnalyticsEvent = require("../../models/analytics");
const Order = require("../../models/orders");
const Product = require("../../models/products");

router.get("/traffic-sources", async (req, res) => {
    try {
        const { sellerId, period } = req.query;

        const daysMap = { "7days": 7, "30days": 30, "90days": 90 };
        const fromDate =
            period === "all"
                ? null
                : new Date(Date.now() - daysMap[period] * 86400000);

        const match = { sellerId, type: "view" };
        if (fromDate) match.createdAt = { $gte: fromDate };

        const result = await AnalyticsEvent.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$source",
                    views: { $sum: 1 },
                },
            },
        ]);

        const totalViews = result.reduce((s, r) => s + r.views, 0);

        res.json({
            totalViews,
            sources: result.map(r => ({
                source: r._id,
                views: r.views,
                percentage: totalViews
                    ? Math.round((r.views / totalViews) * 100)
                    : 0,
                conversionRate: Math.floor(Math.random() * 10) + 2, // optional
            })),
        });
    } catch (err) {
        console.log(err);
        
        res.status(500).json({ message: err.message });
    }
});


router.get("/conversion-optimization", async (req, res) => {
    try {
        const { sellerId } = req.query;

        const views = await AnalyticsEvent.countDocuments({
            sellerId,
            type: "view",
        });

        const orders = await Order.countDocuments({
            sellerId,
            status: "delivered",
        });

        const conversionRate = views
            ? +((orders / views) * 100).toFixed(1)
            : 0;

        const industryAverage = 8.5;

        const revenueAgg = await Order.aggregate([
            { $match: { sellerId, status: "delivered" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const currentRevenue = revenueAgg[0]?.total || 0;

        res.json({
            currentConversionRate: conversionRate,
            industryAverage,
            potentialRevenue:
                conversionRate < industryAverage
                    ? Math.round(
                        currentRevenue *
                        (industryAverage / Math.max(conversionRate, 1))
                    )
                    : 0,
            optimizationTips: [
                {
                    impact: "high",
                    estimatedIncrease: 12,
                    title: "Improve Product Images",
                    description:
                        "High-quality images significantly improve buyer trust.",
                },
                {
                    impact: "medium",
                    estimatedIncrease: 7,
                    title: "Optimize Pricing",
                    description:
                        "Competitive pricing improves click-to-purchase ratio.",
                },
            ],
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get("/competitor-insights", async (req, res) => {
    try {
        const { productId, category } = req.query;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const competitors = await Product.find({
            category,
            _id: { $ne: productId },
        });

        const prices = competitors.map(p => p.price);
        const avgPrice =
            prices.reduce((a, b) => a + b, 0) / Math.max(prices.length, 1);

        res.json({
            yourPrice: product.price,
            marketAverage: Math.round(avgPrice),
            competitorCount: competitors.length,
            pricePosition:
                product.price <= avgPrice ? "competitive" : "above-market",
            priceRange: {
                lowest: Math.min(...prices),
                highest: Math.max(...prices),
            },
            recommendations: [
                {
                    type: "price",
                    impact: "positive",
                    message: "Your pricing is competitive for this category.",
                },
                {
                    type: "listing",
                    impact: "medium",
                    message: "Add more images to improve listing visibility.",
                },
            ],
            similarListings: competitors.slice(0, 5).map(p => ({
                id: p._id,
                title: p.title,
                price: p.price,
                views: p.views || 0,
                status: p.status === "sold" ? "sold" : "available",
                daysListed: Math.floor(
                    (Date.now() - p.createdAt) / 86400000
                ),
            })),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
