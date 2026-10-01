// Shared tone rules and the static pieces of every outreach email, so the
// initial email and the follow-ups stay in one consistent, casual voice.
// Cyril, 2026-09-30: emails read too AI-written. No em dashes, first name
// only (never his full name), friendly and brief, always invite a Zoom/Meet.

export const COPY_STYLE_RULES =
  "Write like a friendly real person, casual and conversational, never salesy. " +
  "Never use em dashes or en dashes. Use plain sentences and commas instead. " +
  "No greeting, no sign-off, no name, no corporate language, no AI mentions, no exclamation marks.";

export const EMAIL_INTRO =
  "Hey, my name is Cyril and I run a small self-made company called Polaris, where I build websites for businesses that don't have one yet. " +
  "Sorry for the cold email. If it's not for you, no worries at all, but if you're interested, keep reading and I'll keep it brief.";

// Honest future-tense offer: nothing is built until they reply (Cyril,
// 2026-09-30). Never say a website "has been made" in the first email.
export const EMAIL_OFFER =
  "I can have a sample website ready for you in just a few minutes.";

export const EMAIL_ADD_MORE =
  "In addition, I can include anything you'd like, such as pages for your services, financing, or the areas you serve, for free on top of the website I'll build for you.";

export const EMAIL_CLOSE =
  "If you're interested, please let me know and send a date and time that works best for you. That way I can schedule it and we can hop on a Zoom call so I can show you the website and tell you more. Feel free to ask anything you'd like.";

export const EMAIL_VIDEO_NOTE =
  "Also, when you respond to this I can send you a video of the website as well. We'll still hop on the Zoom meeting to go over any questions you have and the specifics you want for the website.";

export const EMAIL_LEGIT =
  "And if you're worried this might be a scam, I understand. I'm just a college student trying to build a business on my own. I'm happy to send you my LinkedIn or social media, whatever works best for you, so you can see that I'm legit.";

// Safety net for stored or generated text that still has dashes used as pauses.
export function stripDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ").replace(/\s-\s/g, ", ");
}
