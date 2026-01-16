const { Expo } = require("expo-server-sdk");

const expo = new Expo();

/**
 * Send push notification
 */
async function sendPushNotification(tokens, payload) {
    // Filter invalid tokens
    const validTokens = tokens.filter(Expo.isExpoPushToken);

    if (!validTokens.length) return;

    const messages = validTokens.map(token => ({
        to: token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
    }));

    // console.log(messages);
    

    let res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
    });

    let data = await res.json()
    console.log(data);
    

    // const chunks = expo.chunkPushNotifications(messages);

    // for (const chunk of chunks) {
    //     try {
    //         await expo.sendPushNotificationsAsync(chunk);
    //     } catch (error) {
    //         console.error("Expo push error:", error);
    //     }
    // }
}

module.exports = { sendPushNotification };



// let fetch = require("node-fetch");
// let PushToken = require("../models/pushtoken.js");
// let Notification = require("../models/notification.js");

// sendPushNotification = async ({
//     userId,
//     title,
//     body,
//     type,
//     data = {},
// }) => {
//     const tokens = await PushToken.find({ userId });

//     if (!tokens.length) return;

//     // Save notification to DB
//     await Notification.create({
//         userId,
//         title,
//         body,
//         type,
//         data,
//     });

//     const messages = tokens.map((t) => ({
//         to: t.token,
//         sound: "default",
//         title,
//         body,
//         data,
//     }));

//     await fetch("https://exp.host/--/api/v2/push/send", {
//         method: "POST",
//         headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify(messages),
//     });
// };


// module.exports = sendPushNotification
