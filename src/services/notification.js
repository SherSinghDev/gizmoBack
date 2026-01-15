const PushToken = require("../models/pushtoken");
const Notification = require("../models/notification");
const NotificationPreference = require("../models/notificationPreference");
const { sendPushNotification } = require("../utils/expoPush");

async function notifyUser({
  userId,
  title,
  body,
  type,
  data = {},
}) {
  // Save notification in DB
  await Notification.create({
    userId,
    title,
    body,
    type,
    data,
  });

  // Check preferences
  const prefs = await NotificationPreference.findOne({ userId });
  if (!prefs?.pushEnabled) return;

  if (type && prefs.categories?.[type]?.push === false) return;

  // Get user's push tokens
  const tokens = await PushToken.find({ userId }).distinct("token");

  if (!tokens.length) return;

  // Send push
  await sendPushNotification(tokens, {
    title,
    body,
    data,
  });
}

module.exports = { notifyUser };
