// One-time: authorize Polaris to add meetings to YOUR Google Calendar.
// Sign in as your MAIN Google account (the one whose calendar you check), not
// the polarisoutreach.co sender. Writes GOOGLE_CALENDAR_REFRESH_TOKEN into
// .env.local automatically. Needs the Google Calendar API enabled on the same
// Google Cloud project as the Gmail client (console.cloud.google.com, APIs & Services, Library).
require("dotenv").config({ path: ".env.local" });
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const fs = require("fs");

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3001/oauth/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.local first");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/calendar.events"],
});

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (!parsed.pathname.startsWith("/oauth/callback")) return;
  const code = parsed.query.code;
  if (!code) {
    res.end("No code received.");
    return;
  }
  res.end("Done! Calendar connected. You can close this tab.");
  server.close();

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    console.error("No refresh token returned. Remove Polaris at myaccount.google.com/permissions and run this again.");
    return;
  }
  let env = fs.readFileSync(".env.local", "utf8").replace(/^GOOGLE_CALENDAR_REFRESH_TOKEN=.*\r?\n?/m, "");
  if (!env.endsWith("\n")) env += "\n";
  fs.writeFileSync(".env.local", env + `GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log("\nCalendar connected. Token saved to .env.local. Restart the Polaris server to use it.");
});

server.listen(3001, () => {
  console.log("\nOpen this URL in your browser and sign in with your MAIN Google account:\n");
  console.log(authUrl);
});
