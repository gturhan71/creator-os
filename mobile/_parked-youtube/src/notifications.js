// Pro-only local notifications. These fire from inside the app when a message
// enters it (see app.js handleIncomingThread). There is no server that pushes
// to the phone, so nothing here can react to a message that never reached the
// app — a real inbox connection would call the same handler.

import { LocalNotifications } from "@capacitor/local-notifications";

const REMINDER_ID = 1001;

export async function getPermission() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display; // "granted" | "denied" | "prompt" | "prompt-with-rationale"
  } catch {
    return "denied";
  }
}

export async function requestPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display;
  } catch {
    return "denied";
  }
}

// isExactNotification:false on every schedule call — Android otherwise sends the
// user to the special "Alarms & reminders" settings page, and nothing here needs
// to-the-second timing.
function nextId() {
  return (Date.now() % 2_000_000_000) + 2000;
}

// Returns false when the user hasn't granted permission (nothing is shown).
export async function notifyNow(title, body) {
  if ((await getPermission()) !== "granted") return false;
  await LocalNotifications.schedule({
    notifications: [{ id: nextId(), title, body, schedule: { at: new Date(Date.now() + 400) }, isExactNotification: false }],
  });
  return true;
}

export async function scheduleReminder(title, body, delayMs) {
  if ((await getPermission()) !== "granted") return;
  await LocalNotifications.schedule({
    notifications: [{ id: REMINDER_ID, title, body, schedule: { at: new Date(Date.now() + delayMs) }, isExactNotification: false }],
  });
}

export async function cancelReminder() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  } catch {
    // nothing scheduled — fine
  }
}
