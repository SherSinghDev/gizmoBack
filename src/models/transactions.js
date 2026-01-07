// // models/Transaction.js
// const mongoose = require("mongoose");

// const TransactionSchema = new mongoose.Schema({
//     orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
//     sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     amount: { type: Number, required: true },
//     platformFee: { type: Number, required: true },
//     netAmount: { type: Number, required: true },
//     status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
//     type: { type: String, enum: ["sale"], default: "sale" },
//     paymentMethod: { type: String, required: true },
//     buyerName: { type: String },
//     createdAt: { type: String, default: () => new Date().toISOString() },
//     completedAt: { type: String },
// }, { timestamps: false });

// module.exports = mongoose.model("Transaction", TransactionSchema);



// models/Transaction.js
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
    {
        /* =====================
           Identifiers
        ===================== */
        transactionId: {
            type: String,
            // unique: true,
            // required: true,
        },

        paymentId: {
            type: String, // Razorpay / gateway payment id
        },

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            // required: true,
        },

        buyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // required: true,
        },

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // required: true,
        },

        /* =====================
           Monetary Fields
        ===================== */
        amount: {
            type: Number, // total paid by buyer
            // required: true,
        },

        platformFee: {
            type: Number, // your commission (without GST)
            // required: true,
        },

        gstOnPlatformFee: {
            type: Number,
            default: 0,
        },

        netAmount: {
            type: Number, // seller payout amount
            // required: true,
        },

        currency: {
            type: String,
            default: "INR",
        },

        /* =====================
           Status & Type
        ===================== */
        status: {
            type: String,
            // enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
        },

        type: {
            type: String,
            // enum: ["sale"],
            default: "sale",
        },

        paymentMethod: {
            type: String, // upi | card | netbanking | wallet
            // required: true,
        },

        /* =====================
           Refund (Future-safe)
        ===================== */
        refundAmount: {
            type: Number,
            default: 0,
        },

        refundedAt: {
            type: Date,
        },

        refundReason: {
            type: String,
        },

        /* =====================
           Metadata
        ===================== */
        buyerName: {
            type: String,
        },

        failureReason: {
            type: String,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },

        completedAt: {
            type: Date,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model("Transaction", TransactionSchema);

