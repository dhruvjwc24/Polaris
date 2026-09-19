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

// RFC 2822 headers are meant to be 7-bit ASCII. Any non-ASCII character in a
// raw header value (em-dashes are everywhere in generated subject lines) gets
// misread by mail servers that don't guess it's UTF-8, producing mojibake —
// RFC 2047 encoded-words are how a header declares its own charset.
function encodeHeaderValue(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

// The Google account's profile display name ("Polaris Kafle") leaks into the
// From header unless overridden explicitly here — always send as just "Polaris".
const FROM_NAME = "Polaris";

export function buildRfc2822(to: string, subject: string, body: string): string {
  const msg = [
    `From: ${FROM_NAME} <polarisoutreach.co@gmail.com>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(msg, "utf-8").toString("base64url");
}
