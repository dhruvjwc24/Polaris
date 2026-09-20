// Prints the number of video jobs currently queued or processing, so a
// Claude Code session opening Polaris can check the backlog before doing
// anything else (see CLAUDE.md "Video Queue" section) without needing the
// Next.js server itself running.
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
  .from("video_generation_queue")
  .select("id", { count: "exact", head: true })
  .in("status", ["queued", "processing"]);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(count ?? 0);
