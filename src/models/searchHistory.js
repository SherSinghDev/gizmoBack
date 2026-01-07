// models/SearchHistory.js
const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    query: {
        type: String,
        required: true,
        trim: true,
    },
    filters: {
        type: Object,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

SearchHistorySchema.index({ userId: 1, query: 1 });

module.exports = mongoose.model("SearchHistory", SearchHistorySchema);
