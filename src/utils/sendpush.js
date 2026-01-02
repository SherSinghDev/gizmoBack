let fetch = require("node-fetch");
let PushToken = require("../models/pushtoken.js");
let Notification = require("../models/notification.js");

sendPushNotification = async ({
    userId,
    title,
    body,
    type,
    data = {},
}) => {
    const tokens = await PushToken.find({ userId });

    if (!tokens.length) return;

    // Save notification to DB
    await Notification.create({
        userId,
        title,
        body,
        type,
        data,
    });

    const messages = tokens.map((t) => ({
        to: t.token,
        sound: "default",
        title,
        body,
        data,
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
    });
};


module.exports = sendPushNotification
