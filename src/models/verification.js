const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
    uri: String,
    type: String,
});

const WarrantySchema = new mongoose.Schema({
    type: {
        type: String, // manufacturer | seller | none
    },
    duration: {
        type: Number, // in days
    },
    purchaseDate: {
        type: String,
    },
    verified: {
        type: Boolean,
        default: false,
    },
});

const VerificationSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        productName: String,
        brand: String,

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sellerName: String,

        images: [String],

        status: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending",
        },

        photosStatus: String,
        authorityStatus: String,
        warrantyStatus: String,

        verificationData: {
            imei: String,
            serialNumber: String,

            photos: [PhotoSchema],

            authenticity: {
                score: Number,
                checks: mongoose.Schema.Types.Mixed,
            },

            warranty: WarrantySchema,

            qualityScore: Number,
            badge: String,
        },

        rejectionReason: String,

        submittedAt: {
            type: Date,
            default: Date.now,
        },

        verifiedAt: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "ProductVerification",
    VerificationSchema
);
