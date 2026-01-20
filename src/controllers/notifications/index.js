let express = require("express");
const router = express.Router();
let Notification = require("../../models/notification.js");
let NotificationPreference = require("../../models/notificationPreference.js");
let PushToken = require("../../models/pushtoken.js");
let NotificationSettings = require('../../models/sellernotifications.js')
let jwt = require("jsonwebtoken");
let dotenv = require("dotenv")
dotenv.config()
let { notifyUser } = require('../../services/notification.js')
const admin = require("firebase-admin");



function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
}

/**
 * Admin / system triggered notification
 */
router.post("/send", auth, async (req, res) => {
    const { userId, title, body, type, data } = req.body;

    if (!userId || !title || !body) {
        return res.status(400).json({ message: "Missing fields" });
    }

    await notifyUser({
        userId,
        title,
        body,
        type,
        data,
    });

    console.log("yes");


    res.json({ success: true });
});

// router.post("/demo", auth, async (req, res) => {
//     const userId = req.user.id;
//     console.log(userId);
//     await notifyUser({
//         userId,
//         title: "Welcome 👋",
//         body: "This is a demo push notification",
//         type: "marketing",
//         data: { screen: "Home" },
//     });

//     console.log("yes");


//     res.json({ success: true });
// });


router.post("/demo", auth, async (req, res) => {
    try {
        const userId = req.user.id;

        await notifyUser({
            userId,
            title: "Welcome 👋",
            body: "This is a demo push notification",
            type: "marketing",
            data: {
                screen: "Home",
                demo: true,
            },
        });

        res.json({
            success: true,
            message: "Demo push notification sent",
        });
    } catch (err) {
        console.error("Demo push error:", err);
        res.status(500).json({ success: false });
    }
});




router.get("/", auth, async (req, res) => {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);

    const unreadCount = await Notification.countDocuments({
        userId,
        read: false,
    });

    res.json({ notifications, unreadCount });
});


// router.get("/", auth, async (req, res) => {
//     const userId = req.user.id;

//     // Mock notifications
//     const notifications = [
//         {
//             _id: "1",
//             userId,
//             title: "New Order Received",
//             body: "You have received a new order #ORD1234",
//             type: "orders",
//             data: { orderId: "ORD1234" },
//             read: false,
//             createdAt: new Date(Date.now() - 5 * 60 * 1000),
//         },
//         {
//             _id: "2",
//             userId,
//             title: "Inventory Low",
//             body: "Product ABC stock is running low",
//             type: "inventory",
//             data: { productId: "ABC" },
//             read: false,
//             createdAt: new Date(Date.now() - 30 * 60 * 1000),
//         },
//         {
//             _id: "3",
//             userId,
//             title: "New Review",
//             body: "You received a 5-star review 🎉",
//             type: "reviews",
//             data: { rating: 5 },
//             read: false,
//             createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
//         },
//         {
//             _id: "4",
//             userId,
//             title: "Marketing Update",
//             body: "Your campaign performance report is ready",
//             type: "marketing",
//             data: {},
//             read: false,
//             createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
//         },
//     ];

//     // Sort latest first (like MongoDB .sort({ createdAt: -1 }))
//     notifications.sort((a, b) => b.createdAt - a.createdAt);

//     // Count unread notifications
//     const unreadCount = notifications.filter(n => !n.read).length;

//     res.json({
//         notifications,
//         unreadCount,
//     });
// });



router.put("/read", auth, async (req, res) => {
    const userId = req.user.id;
    const { notificationId, markAll } = req.body;

    if (markAll) {
        await Notification.updateMany(
            { userId },
            { $set: { read: true } }
        );
    } else {
        await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { read: true }
        );
    }

    res.json({ success: true });
});

router.get("/preferences", auth, async (req, res) => {
    const userId = req.user.id;

    let prefs = await NotificationPreference.findOne({ userId });

    if (!prefs) {
        prefs = await NotificationPreference.create({
            userId,
            pushEnabled: true,
            emailEnabled: true,
            categories: {
                orders: { push: true, email: true },
                messages: { push: true, email: true },
                inventory: { push: true, email: true },
                reviews: { push: true, email: true },
                marketing: { push: false, email: true },
            },
        });
    }

    res.json(prefs);
});


router.put("/preferences", auth, async (req, res) => {
    const userId = req.user.id;

    const prefs = await NotificationPreference.findOneAndUpdate(
        { userId },
        { $set: req.body },
        { new: true, upsert: true }
    );

    res.json(prefs);
});




// 1. Firebase Admin Initialize करें (यह फाइल के ऊपर या अलग config फाइल में होना चाहिए)
// ध्यान दें: serviceAccountKey.json का सही पथ दें
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}


router.post("/register-token", auth, async (req, res) => {
    try {
        const { token, platform } = req.body;
        const userId = req.user.id; // Auth middleware से यूजर ID

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        console.log(`📲 Registering token for user ${userId}:`, token);

        // 1. डेटाबेस में टोकन सेव करें (ताकि बाद में भी नोटिफिकेशन भेज सकें)
        // यह मानकर कि आपके User मॉडल में 'fcmToken' फील्ड है
        // await User.findByIdAndUpdate(userId, {
        //     fcmToken: token,
        //     platform: platform // android/ios
        // });

        let push = PushToken.findOne({ userId })
        if (!push) {
            await PushToken.create({ userId, token, platform });
        }
        else {
            await PushToken.findOneAndUpdate(
                { userId, token },
                { platform },
                { upsert: true }
            );
        }

        // 2. तुरंत एक Dummy Notification भेजें (Testing के लिए)
        const message = {
            notification: {
                title: "Hello from UsedGizmo! 👋",
                body: "यह एक टेस्ट नोटिफिकेशन है यह चेक करने के लिए कि आपका सेटअप काम कर रहा है।",
            },
            // अगर आप कस्टम डेटा भेजना चाहते हैं:
            data: {
                screen: "Profile",
                someId: "12345",
            },
            token: token, // यह वही devicePushToken है जो फ्रंटएंड से आया है
        };

        // Firebase Admin से भेजें
        const response = await admin.messaging().send(message);


        console.log("✅ Successfully sent test notification:", response);

        return res.status(200).json({
            success: true,
            message: "Token registered and test notification sent!",
            messageId: response
        });

    } catch (error) {
        console.error("❌ Error sending notification:", error);
        // अगर टोकन एक्सपायर या गलत है, तो Firebase error देगा
        return res.status(500).json({ error: error.message });
    }
});

// router.post("/register-token", auth, async (req, res) => {
//     const userId = req.user.id;
//     const { token, platform } = req.body;
//     console.log("body", req.body);

//     if (!token) return res.status(400).json({ message: "Token required" });
//     let push = PushToken.findOne({ userId })
//     if (!push) {
//         await PushToken.create({ userId, token, platform });
//     }
//     else {
//         await PushToken.findOneAndUpdate(
//             { userId, token },
//             { platform },
//             { upsert: true }
//         );
//     }
//     res.json({ success: true });
// });


router.get("/seller-notificatins", auth, async (req, res) => {
    try {
        const userId = req.user.id;

        let settings = await NotificationSettings.findOne({ userId });

        // If not exists → create with defaults
        if (!settings) {
            settings = await NotificationSettings.create({ userId });
        }

        // console.log(settings);


        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch notification settings" });
    }
});

/**
 * UPDATE seller notification settings
 */
router.put("/seller-notificatins", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        const settings = await NotificationSettings.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true, upsert: true }
        );

        console.log(settings);


        res.json(settings);
    } catch (err) {
        console.log(err);

        res.status(500).json({ message: "Failed to update settings" });
    }
});

module.exports = router;
