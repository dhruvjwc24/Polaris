import { google } from "googleapis";

// Adds a booked meeting to Cyril's own Google Calendar (Cyril, 2026-09-30: he
// checks his calendar every morning). Uses a SEPARATE refresh token from the
// Gmail sender, authorized by his main Google account with only the
// calendar.events scope: run `npm run calendar:auth` once.
// Returns false (never throws) when the calendar isn't connected or the API
// call fails, so a calendar problem can never block the email to the lead.

const TZ = "America/New_York";

export function calendarConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  );
}

export async function addMeetingToCalendar(opts: {
  businessName: string;
  leadEmail: string | null;
  startIso: string;
  windowEndIso?: string;
  zoomDetails: string;
  replyText?: string;
  minutes?: number;
}): Promise<boolean> {
  if (!calendarConfigured()) return false;
  try {
    const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN });
    const calendar = google.calendar({ version: "v3", auth });

    const start = new Date(opts.startIso);
    const end = new Date(start.getTime() + (opts.minutes ?? 30) * 60 * 1000);
    const windowLine = opts.windowEndIso
      ? `\nThey said they're free until ${new Date(opts.windowEndIso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" })}.`
      : "";

    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Polaris website demo: ${opts.businessName}`,
        description:
          `Website demo call with ${opts.businessName}${opts.leadEmail ? ` (${opts.leadEmail})` : ""}.${windowLine}\n\n` +
          `${opts.zoomDetails}` +
          (opts.replyText ? `\n\nTheir reply:\n${opts.replyText.slice(0, 500)}` : ""),
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 10 },
          ],
        },
      },
    });
    return true;
  } catch (err) {
    console.error("[googleCalendar] failed to add event:", err instanceof Error ? err.message : err);
    return false;
  }
}
