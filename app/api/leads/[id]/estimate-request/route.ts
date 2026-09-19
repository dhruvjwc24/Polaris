import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "@/lib/outreach/gmailClient";
import { notifyMainEmail } from "@/lib/notify";

const Body = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  heardAbout: z.string().optional().nullable(),
  serviceNeeded: z.string().optional().nullable(),
  smsInfoConsent: z.boolean().optional().default(false),
  smsPromoConsent: z.boolean().optional().default(false),
});

// The mockup site's estimate form posts here. This is a real prospect
// submitting real contact info, so it must be stored even if the notification
// email below fails — never let a notification error swallow the submission.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const { data: lead } = await db.from("leads").select("business_name, status, email").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Pre-sale, this is a demo site — nobody on the business's end is watching an
  // inbox for it, so submissions notify Cyril. Once a lead is a paying
  // customer (status "closed"), their real site should route leads to them.
  const isCustomer = lead.status === "closed" && !!lead.email;

  const { error } = await db.from("estimate_requests").insert({
    lead_id: id,
    name: b.name,
    email: b.email,
    phone: b.phone ?? null,
    zip: b.zip ?? null,
    address: b.address ?? null,
    heard_about: b.heardAbout ?? null,
    service_needed: b.serviceNeeded ?? null,
    sms_info_consent: b.smsInfoConsent,
    sms_promo_consent: b.smsPromoConsent,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bodyLines = [
    isCustomer
      ? `You have a new estimate request from your website.`
      : `Someone filled out the estimate form on the ${lead.business_name} mockup site.`,
    "",
    `Name: ${b.name}`,
    `Email: ${b.email}`,
    b.phone ? `Phone: ${b.phone}` : null,
    b.address ? `Address: ${b.address}` : null,
    b.zip ? `Zip: ${b.zip}` : null,
    b.serviceNeeded ? `Service needed: ${b.serviceNeeded}` : null,
    b.heardAbout ? `Heard about us via: ${b.heardAbout}` : null,
  ].filter(Boolean).join("\n");

  try {
    if (isCustomer) {
      const gmail = getGmailClient();
      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: buildRfc2822(lead.email!, "New estimate request from your website", bodyLines) },
      });
    } else {
      await notifyMainEmail(`New estimate request — ${lead.business_name}`, bodyLines);
    }
  } catch (err) {
    console.error(`[estimate-request] notification email failed for lead ${id}:`, err);
  }

  return NextResponse.json({ ok: true });
}
