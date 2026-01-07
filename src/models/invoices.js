// // models/Invoice.js
// const mongoose = require("mongoose");

// const InvoiceSchema = new mongoose.Schema({
//     invoiceNumber: { type: String, required: true, unique: true },
//     sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     amount: { type: Number, required: true },
//     platformFee: { type: Number, required: true },
//     gst: { type: Number, required: true },
//     netAmount: { type: Number, required: true },
//     status: { type: String, enum: ["paid", "pending", "overdue"], default: "pending" },
//     issuedAt: { type: String, default: () => new Date().toISOString() },
//     dueAt: { type: String },
//     paidAt: { type: String },
//     transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
//     period: { type: String }, // e.g. "2025-11"
// }, { timestamps: false });

// module.exports = mongoose.model("Invoice", InvoiceSchema);


// models/Invoice.js
const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
    {
        /* ======================
           Identifiers
        ====================== */
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        /* ======================
           Period
        ====================== */
        period: {
            type: String, // "2025-09"
            required: true,
        },

        invoiceType: {
            type: String,
            enum: ["seller_settlement"],
            default: "seller_settlement",
        },

        /* ======================
           Amount Breakdown
        ====================== */
        amount: {
            type: Number, // sum of order totals
            required: true,
        },

        platformFee: {
            type: Number, // excluding GST
            required: true,
        },

        gst: {
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            igst: { type: Number, default: 0 },
            total: { type: Number, required: true },
        },

        netAmount: {
            type: Number, // seller payout amount
            required: true,
        },

        currency: {
            type: String,
            default: "INR",
        },

        /* ======================
           References
        ====================== */
        transactions: [
            { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
        ],

        payoutId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payout",
        },

        /* ======================
           Status Tracking
        ====================== */
        status: {
            type: String,
            enum: ["pending", "paid", "overdue"],
            default: "pending",
        },

        /* ======================
           Dates
        ====================== */
        issuedAt: {
            type: Date,
            default: Date.now,
        },

        dueAt: {
            type: Date,
        },

        paidAt: {
            type: Date,
        },
    },
    {
        timestamps: false,
        versionKey: false,
    }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
