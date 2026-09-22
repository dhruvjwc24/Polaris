import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";
import { discoverContacts } from "@/lib/leads/contactDiscoveryService";

const Body = z.object({ id: z.string().uuid() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await discoverContacts([parsed.data.id]);

  const { data: lead, error } = await db
    .from("leads")
    .select("email, phone, facebook_url, instagram_url, needs_contact_review")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-search found nothing at all (no email, phone, or social) — scratch the
  // lead entirely rather than leaving it to sit in review forever.
  if (lead && !lead.email && !lead.phone && !lead.facebook_url && !lead.instagram_url) {
    await db.from("leads").delete().eq("id", parsed.data.id);
    return NextResponse.json({ scratched: true });
  }

  return NextResponse.json(lead);
}
