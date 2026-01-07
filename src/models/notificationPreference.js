let mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
    pushEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    categories: {
      orders: { push: Boolean, email: Boolean },
      messages: { push: Boolean, email: Boolean },
      inventory: { push: Boolean, email: Boolean },
      reviews: { push: Boolean, email: Boolean },
      marketing: { push: Boolean, email: Boolean },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationPreference", preferenceSchema);
