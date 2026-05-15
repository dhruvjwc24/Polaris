const { google } = require("googleapis");
const http = require("http");
const url = require("url");

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
  scope: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
});

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (!parsed.pathname.startsWith("/oauth/callback")) return;

  const code = parsed.query.code;
  if (!code) {
    res.end("No code received.");
    return;
  }

  res.end("Done! You can close this tab and check your terminal.");
  server.close();

  const { tokens } = await oauth2.getToken(code);
  console.log("\nAdd this to your .env.local:\n");
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
});

server.listen(3001, () => {
  console.log("\nOpen this URL in your browser:\n");
  console.log(authUrl);
});
