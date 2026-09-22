// Prints the number of leads waiting in the manual-outreach pile (phone but
// no email — never auto-contacted) so a Claude Code session opening Polaris
// can remind Cyril before doing anything else (see CLAUDE.md "Manual
// Outreach Pile").
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env vars not set");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { count, error } = await db
  .from("leads")
  .select("id", { count: "exact", head: true })
  .is("email", null)
  .not("phone", "is", null)
  .eq("status", "video_ready")
  .eq("manual_contact_done", false);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(count ?? 0);
