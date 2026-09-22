// Pings Gmail with the current GMAIL_REFRESH_TOKEN so a dead/expired token
// (e.g. the 7-day expiry on an unverified "Testing"-status OAuth app — see
// CLAUDE.md "Pending Decision: Google Workspace") gets caught immediately at
// session start, instead of silently failing on the next real send/reply-check.
import { config } from "dotenv";
import { google } from "googleapis";

config({ path: ".env.local" });

const oauth2 = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

try {
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  await gmail.users.getProfile({ userId: "me" });
  console.log("OK");
} catch (err) {
  console.log(`DEAD: ${err.message}`);
  console.log("Run: npm run gmail:reauth");
  process.exit(1);
}
