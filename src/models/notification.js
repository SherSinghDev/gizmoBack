let mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: String,
        body: String,
        type: String, // orders | messages | inventory | reviews | marketing
        data: Object,
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports =  mongoose.model("Notification", notificationSchema);
