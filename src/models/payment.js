const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
    {
        paymentId: { type: String, required: true, unique: true },
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        orderTempData: { type: Object }, // store order payload temporarily
        amount: { type: Number, required: true },
        method: { type: String, enum: ["upi", "card", "wallet"], required: true },
        status: {
            type: String,
            enum: ["created", "success", "failed"],
            default: "created",
        },
        gateway: { type: String, default: "dummy" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
