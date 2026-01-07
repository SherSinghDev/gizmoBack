const mongoose = require("mongoose");

const ProductViewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // guest users
    },

    sessionId: {
      type: String,
    },

    ipAddress: {
      type: String,
    },

    platform: {
      type: String, // web / android / ios
    },

    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model("ProductView", ProductViewSchema);
