import { google } from "googleapis";

function getOAuthClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return oauth2;
}

export function getGmailClient() {
  return google.gmail({ version: "v1", auth: getOAuthClient() });
}

export function buildRfc2822(to: string, subject: string, body: string): string {
  const msg = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(msg).toString("base64url");
}
