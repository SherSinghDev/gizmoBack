let mongoose = require("mongoose");

const ReturnRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      enum: [
        "defective",
        "wrong_item",
        "not_as_described",
        "changed_mind",
        "damaged",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    images: {
      type: [String], // URLs of uploaded images
      default: [],
    },

    requestedAction: {
      type: String,
      enum: ["refund", "replacement"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "return_initiated",
        "return_received",
        "refund_processed",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    refundAmount: {
      type: Number,
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },

    createdAt: {
      type: String,
      default: () => new Date().toISOString(),
    },

    updatedAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
  },
  {
    timestamps: true, // auto adds createdAt & updatedAt as Dates
  }
);

// Before saving → update updatedAt string format
// ReturnRequestSchema.pre("save", function (next) {
//   this.updatedAt = new Date().toISOString();
//   next();
// });

module.exports = mongoose.model("ReturnRequest", ReturnRequestSchema);
