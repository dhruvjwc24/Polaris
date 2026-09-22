import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";

// z.string().url() alone accepts any URL-shaped string, including
// javascript: — reject anything that isn't a plain http(s) link before it
// can ever reach an <a href> (see components/ExamplesList.tsx).
const Body = z.object({
  url: z
    .string()
    .url()
    .refine(
      (u) => {
        try {
          return ["http:", "https:"].includes(new URL(u).protocol);
        } catch {
          return false;
        }
      },
      { message: "URL must be http or https" }
    ),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { error } = await db.from("reference_examples").insert({
    url: parsed.data.url,
    note: parsed.data.note ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
