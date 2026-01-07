const mongoose = require("mongoose");

const AnalyticsEventSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    type: {
        type: String,
        enum: ["view", "inquiry", "order", "sale"],
        required: true,
    },
    source: {
        type: String, // direct, search, ads, share
        default: "direct",
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
