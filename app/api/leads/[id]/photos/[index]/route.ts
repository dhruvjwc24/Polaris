import { db } from "@/lib/db/supabase";
import { placesFetch, PlacesBudgetExceeded } from "@/lib/leads/placesBudget";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index } = await params;
  const i = parseInt(index, 10);

  const { data: lead } = await db
    .from("leads")
    .select("photo_refs, photo_urls")
    .eq("id", id)
    .maybeSingle();

  // Photos already copied into Supabase Storage are free to serve; only fall
  // back to a billed Google Places Photo request when no stored copy exists.
  const stored = lead?.photo_urls?.[i];
  if (stored) return Response.redirect(stored, 302);

  const ref = lead?.photo_refs?.[i];
  if (!ref) return new Response("Not found", { status: 404 });

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${ref}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  let res: Response;
  try {
    res = await placesFetch("photo", url, { redirect: "follow" });
  } catch (err) {
    if (err instanceof PlacesBudgetExceeded) return new Response("Photo budget reached", { status: 429 });
    throw err;
  }
  if (!res.ok) return new Response("Photo unavailable", { status: 502 });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
