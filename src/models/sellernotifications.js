let mongoose = require("mongoose");

const notificationSettingsSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        orders: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        reviews: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "NotificationSettings",
    notificationSettingsSchema
);
