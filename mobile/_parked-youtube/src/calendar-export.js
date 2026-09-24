// Pro-only: export a booking as a standard .ics file and hand it to the
// native share sheet — the OS then offers Apple Calendar, Google Calendar,
// Outlook, or any other calendar app the user has installed. No calendar
// API, no OAuth, no backend: this is the same "no server of ours" model as
// the rest of the app, just via a file instead of a network call.

import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isPro } from "./entitlements.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

// booking.date carries the day; startTime/endTime ("14:00") carry the time
// — combine them into one local datetime for the ICS DTSTART/DTEND fields.
function toIcsLocalDateTime(dateIso, timeStr) {
  const d = new Date(dateIso);
  const [h, m] = timeStr.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function icsEscape(text) {
  return String(text ?? "").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

function buildIcs(booking) {
  const dtStart = toIcsLocalDateTime(booking.date, booking.startTime);
  const dtEnd = toIcsLocalDateTime(booking.date, booking.endTime);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Creator OS//Booking Export//TR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@creatoros.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(booking.title)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export async function exportBookingToCalendar(booking) {
  if (!isPro()) {
    throw new Error("PRO_REQUIRED");
  }
  const ics = buildIcs(booking);
  const fileName = `creatoros-booking-${booking.id}.ics`;
  await Filesystem.writeFile({ path: fileName, data: ics, directory: Directory.Cache, encoding: Encoding.UTF8 });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  await Share.share({ title: booking.title, url: uri });
}
