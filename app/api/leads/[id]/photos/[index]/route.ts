import { db } from "@/lib/db/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index } = await params;
  const i = parseInt(index, 10);

  const { data: lead } = await db
    .from("leads")
    .select("photo_refs")
    .eq("id", id)
    .maybeSingle();

  const ref = lead?.photo_refs?.[i];
  if (!ref) return new Response("Not found", { status: 404 });

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${ref}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return new Response("Photo unavailable", { status: 502 });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
