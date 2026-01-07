let mongoose = require('mongoose')

const VendorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        avatar: {
            type: String,
            default: null,
        },

        rating: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },

        totalRatings: {
            type: Number,
            required: true,
            default: 0,
        },

        responseTime: {
            type: String,
            required: true,
        },

        memberSince: {
            type: Date,
            required: true,
            default: Date.now,
        },

        totalSales: {
            type: Number,
            required: true,
            default: 0,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        location: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vendor", VendorSchema);
