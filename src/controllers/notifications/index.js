let express = require("express");
const router = express.Router();
let Notification = require("../../models/notification.js");
let NotificationPreference = require("../../models/notificationPreference.js");
let PushToken = require("../../models/pushtoken.js");
let NotificationSettings = require('../../models/sellernotifications.js')
let jwt = require("jsonwebtoken");
let dotenv = require("dotenv")
dotenv.config()



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

    res.json({ success: true });
});

router.post("/demo", auth, async (req, res) => {
    const userId = req.user.id;
    console.log(userId);
    await notifyUser({
        userId,
        title: "Welcome 👋",
        body: "This is a demo push notification",
        type: "marketing",
        data: { screen: "Home" },
    });

    res.json({ success: true });
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

router.post("/register-token", auth, async (req, res) => {
    const userId = req.user.id;
    const { token, platform } = req.body;

    if (!token) return res.status(400).json({ message: "Token required" });

    await PushToken.findOneAndUpdate(
        { userId, token },
        { platform },
        { upsert: true }
    );
    res.json({ success: true });
});


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
