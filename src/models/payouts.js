// models/Payout.js
const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
    initiatedAt: { type: String, default: () => new Date().toISOString() },
    completedAt: { type: String },
    utrNumber: { type: String },
    bankAccount: { type: String },
}, { timestamps: false });

module.exports = mongoose.model("Payout", PayoutSchema);
