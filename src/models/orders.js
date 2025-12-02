let mongoose = require("mongoose");

const ShippingDetailsSchema = new mongoose.Schema({
    courierPartner: String,
    trackingNumber: String,
    estimatedDelivery: String,
    shippedAt: String,
    trackingUrl: String,
    deliveredAt: Date
});

const OrderNoteSchema = new mongoose.Schema({
    id: { type: String, required: true },
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    content: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
});

const TaxDetailsSchema = new mongoose.Schema({
    subtotal: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalTax: Number,
});

const PlatformFeeDetailsSchema = new mongoose.Schema({
    baseFee: Number,
    gst: Number,
    total: Number,
    percentage: Number,
});

const ProductDetailsSchema = new mongoose.Schema({
    title: String,
    brand: String,
    model: String,
    condition: String,
    images: [String],
});

const BuyerInfoSchema = new mongoose.Schema({
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
});

// Main Order Schema
const OrderSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        

        amount: { type: Number, required: true },

        status: {
            type: String,

            default: "pending",
        },

        paymentStatus: {
            type: String,
            default: "pending",
        },

        productDetails: ProductDetailsSchema,
        buyerInfo: BuyerInfoSchema,

        shippingDetails: ShippingDetailsSchema,
        taxDetails: TaxDetailsSchema,
        platformFeeDetails: PlatformFeeDetailsSchema,

        cancelReason: String,
        cancelledBy: {
            type: String,
        },
        cancelledAt: String,

        notes: [OrderNoteSchema],
    },
    { timestamps: true }
);

// Export the model
module.exports = mongoose.model("Order", OrderSchema);
