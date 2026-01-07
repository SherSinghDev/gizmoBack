let mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        token: String,
        platform: String, // ios | android
    },
    { timestamps: true }
);

module.exports = mongoose.model("PushToken", pushTokenSchema);
