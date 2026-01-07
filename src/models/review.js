const mongoose = require("mongoose");

const sellerResponseSchema = new mongoose.Schema({
    response: {
        type: String,
        // required: true,
        trim: true,
    },
    respondedAt: {
        type: Date,
        default: Date.now,
    },
});

const reviewSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userName: {
            type: String,
            required: true,
            trim: true,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        sellerResponse: {
            type: sellerResponseSchema,
            default: null,
        },
        // ADD FLAG FIELDS
        flagged: { type: Boolean, default: false },
        flagReason: { type: String },
        flaggedAt: { type: Date },
    },
    { timestamps: true }
);

// Convert MongoDB _id → id to match your type
reviewSchema.method("toJSON", function () {
    const { _id, __v, ...object } = this.toObject({ virtuals: true });
    object.id = _id.toString();
    return object;
});

module.exports = mongoose.model("Review", reviewSchema);
