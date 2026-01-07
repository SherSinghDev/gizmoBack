// models/SavedSearch.js
const mongoose = require("mongoose");

const SavedSearchSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: { type: String, required: true },
    query: { type: String, required: true },
    filters: { type: Object, default: {} },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("SavedSearch", SavedSearchSchema);
