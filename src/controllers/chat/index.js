let express = require("express");
let Chat = require("../../models/chat.js");
// let { getAIResponse } = require("../services/ai.service.js");

const router = express.Router();

const commonFAQs = [
    {
        q: 'how do i track my order?',
        a: 'Go to Account > My Orders and tap on your order to see tracking details.',
    },
    {
        q: 'how to manage users?',
        a: 'Navigate to Users tab, tap three dots, and now you can active/suspend the user and you can also change their roles.',
    },
    {
        q: 'how do i verify kyc?',
        a: 'Navigate to KYC Managment tab, tap view details, and now you can approve or reject kyc of the users.',
    },
    {
        q: 'how do i add a product?',
        a: 'Navigate to Sell tab, tap Add Listing, and fill in product details with photos.',
    },
    {
        q: 'how long does kyc verification take?',
        a: 'KYC verification typically takes 24–48 hours. You’ll be notified once approved.',
    },
    {
        q: 'when will i get paid?',
        a: 'Payouts are processed within 2–3 business days after delivery confirmation.',
    },
    {
        q: 'how do i return a product?',
        a: 'Go to your order, tap Request Return, select a reason, and follow the instructions.',
    },
];



function getFAQResponse(userMessage, part) {
    console.log(userMessage);

    if (!userMessage) return null;

    const normalized = userMessage?.toLowerCase()?.trim() || "";
    const parted = part?.toLowerCase()?.trim() || "";

    console.log(normalized);
    console.log(parted);


    return commonFAQs.find(faq =>
        normalized == faq.q || parted == faq.q
    );
}



async function getAIResponse(roleType) {
    // const systemPrompt = {
    //     buyer: "You are buyer support assistant...",
    //     seller: "You are seller support assistant...",
    //     admin: "You are admin support assistant...",
    // };

    // Replace with OpenAI / Rork / Gemini
    return `AI reply for ${roleType}: Escalate the conversation to a human support agent`;
}


/**
 * Create or continue chat
 */
// router.post("/message", async (req, res) => {
//     const { userId, roleType, message, part } = req.body;

//     let chat = await Chat.findOne({ userId, roleType });

//     if (!chat) {
//         chat = await Chat.create({
//             userId,
//             roleType,
//             messages: [],
//         });
//     }

//     // 1️⃣ Push USER message with parts
//     chat.messages.push({
//         role: "user",
//         content: message,
//         parts: [
//             {
//                 type: "text",
//                 text: part || message,
//             },
//         ],
//     });

//     // 2️⃣ Get AI response
//     const aiReply = await getAIResponse(roleType, chat.messages);

//     // 3️⃣ Push ASSISTANT message with tool part
//     chat.messages.push({
//         role: "assistant",
//         content: aiReply,
//         parts: [
//             {
//                 type: "tool",
//                 toolName: "chatgpt",
//             },
//         ],
//     });

//     await chat.save();

//     res.json({
//         success: true,
//         messages: chat.messages,
//     });
// });


router.post("/message", async (req, res) => {
    try {
        const { userId, roleType, message, part } = req.body;

        let chat = await Chat.findOne({ userId, roleType });

        if (!chat) {
            chat = await Chat.create({
                userId,
                roleType,
                messages: [],
            });
        }

        // 1️⃣ Store USER message
        chat.messages.push({
            role: "user",
            content: part,
            parts: [
                {
                    type: "text",
                    text: part || message,
                },
            ],
        });

        // 2️⃣ Check FAQ first
        const faqMatch = getFAQResponse(message, part);

        let replyText;
        let replySource;

        if (faqMatch) {
            replyText = faqMatch.a;
            replySource = "faq";
        } else {
            replyText = await getAIResponse(roleType);
            replySource = "ai";
        }

        // 3️⃣ Store ASSISTANT response
        chat.messages.push({
            role: "assistant",
            content: replyText,
            parts: [
                {
                    type: replySource === "faq" ? "text" : "tool",
                    text: replySource === "faq" ? replyText : undefined,
                    toolName: replySource === "ai" ? "chatgpt" : undefined,
                },
            ],
        });

        await chat.save();

        let length = chat.messages.length

        res.json({
            success: true,
            messages: [chat.messages[length - 2], chat.messages[length - 1]],
            source: replySource, // 👈 helpful for frontend
        });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});




/**
 * Escalate to human
 */
router.post("/escalate", async (req, res) => {
    const { userId, roleType, reason } = req.body;

    const chat = await Chat.findOne({ userId, roleType });

    if (chat) {
        chat.escalated = true;
        chat.messages.push({
            role: "assistant",
            content: `Escalated to human support. Reason: ${reason}`,
        });
        await chat.save();
    }

    res.json({ success: true });
});

module.exports = router;
