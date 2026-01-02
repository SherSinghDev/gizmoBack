const mongoose = require("mongoose");

const PartsSchema = new mongoose.Schema({
    type: {
        type:String,
        enum: ["text", "tool", "human"],
        // required: true,
    },
    text: String,
    toolName: String,
});

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant", "human"],
        required: true,
    },
    content: String,
    tool: String,
    parts: [PartsSchema],
    createdAt: { type: Date, default: Date.now },
});

const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roleType: {
        type: String,
        enum: ["buyer", "seller", "admin"],
    },
    escalated: { type: Boolean, default: false },
    messages: [MessageSchema],
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);
