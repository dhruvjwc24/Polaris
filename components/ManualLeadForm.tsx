"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExtractedBusiness {
  businessName: string;
  phone: string | null;
  websiteUrl: string | null;
  location: string | null;
  city: string | null;
  rating: number | null;
  reviewCount: number | null;
  businessHours: string[] | null;
  reviewSnippets: { author: string; rating: number; text: string; time_desc: string }[] | null;
  photoRefs: string[] | null;
  googleMapsId: string | null;
}

export function ManualLeadForm() {
  const router = useRouter();
  const [mapsUrl, setMapsUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [photoUrls, setPhotoUrls] = useState("");
  const [reviewsText, setReviewsText] = useState("");

  const [location, setLocation] = useState<string | null>(null);
  const [googleMapsId, setGoogleMapsId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [photoRefs, setPhotoRefs] = useState<string[] | null>(null);
  const [structuredReviews, setStructuredReviews] = useState<ExtractedBusiness["reviewSnippets"]>(null);

  async function extract() {
    if (!mapsUrl.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/leads/extract-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapsUrl: mapsUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? "Extraction failed");
        return;
      }
      const d: ExtractedBusiness = data;
      setBusinessName(d.businessName ?? "");
      setPhone(d.phone ?? "");
      setWebsiteUrl(d.websiteUrl ?? "");
      setCity(d.city ?? "");
      setLocation(d.location ?? null);
      setGoogleMapsId(d.googleMapsId ?? null);
      setRating(d.rating ?? null);
      setReviewCount(d.reviewCount ?? null);
      setBusinessHours((d.businessHours ?? []).join("\n"));
      setPhotoRefs(d.photoRefs ?? null);
      setStructuredReviews(d.reviewSnippets ?? null);
      setReviewsText(
        (d.reviewSnippets ?? [])
          .map((r) => `${r.author} (${r.rating}) — ${r.text}`)
          .join("\n")
      );
    } finally {
      setExtracting(false);
    }
  }

  function parseReviewsText(): { author: string; rating: number; text: string; time_desc: string }[] | undefined {
    // If extraction already gave us structured reviews and the textarea wasn't hand-edited
    // in a way we can't parse, prefer the structured version.
    if (structuredReviews?.length) return structuredReviews;
    const lines = reviewsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return undefined;
    const parsed = lines
      .map((line) => {
        const m = line.match(/^(.+?)\s*\((\d(?:\.\d)?)\)\s*[—\-]\s*(.+)$/);
        if (!m) return null;
        return { author: m[1].trim(), rating: Number(m[2]), text: m[3].trim(), time_desc: "" };
      })
      .filter((r): r is { author: string; rating: number; text: string; time_desc: string } => r !== null);
    return parsed.length ? parsed : undefined;
  }

  async function submit() {
    if (!businessName.trim() || !niche.trim() || !city.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          niche: niche.trim(),
          city: city.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          facebookUrl: facebookUrl.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          location: location ?? undefined,
          googleMapsId: googleMapsId ?? undefined,
          rating: rating ?? undefined,
          reviewCount: reviewCount ?? undefined,
          businessHours: businessHours.split("\n").map((l) => l.trim()).filter(Boolean) || undefined,
          reviewSnippets: parseReviewsText(),
          photoRefs: photoRefs ?? undefined,
          photoUrls: photoUrls.split("\n").map((l) => l.trim()).filter(Boolean) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to create lead");
        return;
      }
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gray-900 rounded p-4">
        <label className="block text-xs text-gray-500 mb-2">Google Maps link (optional — auto-fills the fields below)</label>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm"
            placeholder="https://maps.app.goo.gl/..."
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
          />
          <button
            onClick={extract}
            disabled={extracting || !mapsUrl.trim()}
            className="bg-white text-gray-950 rounded px-4 py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {extracting ? "Extracting..." : "Extract"}
          </button>
        </div>
        {extractError && <p className="text-red-400 text-xs mt-2">{extractError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Business name *" value={businessName} onChange={setBusinessName} />
        <Field label="Niche *" value={niche} onChange={setNiche} placeholder="e.g. roofing, plumbing, dental" />
        <Field label="City *" value={city} onChange={setCity} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="Email" value={email} onChange={setEmail} />
        <Field label="Website" value={websiteUrl} onChange={setWebsiteUrl} />
        <Field label="Facebook" value={facebookUrl} onChange={setFacebookUrl} />
        <Field label="Instagram" value={instagramUrl} onChange={setInstagramUrl} />
        <Field label="LinkedIn" value={linkedinUrl} onChange={setLinkedinUrl} />
      </div>

      <TextArea label="Business hours (one per line)" value={businessHours} onChange={setBusinessHours} rows={4} />
      <TextArea
        label="Reviews (one per line: Author (rating) — text)"
        value={reviewsText}
        onChange={(v) => { setReviewsText(v); setStructuredReviews(null); }}
        rows={4}
      />
      <TextArea label="Photo URLs (one per line, only if not extracted from Maps)" value={photoUrls} onChange={setPhotoUrls} rows={3} />

      <button
        onClick={submit}
        disabled={submitting || !businessName.trim() || !niche.trim() || !city.trim()}
        className="bg-white text-gray-950 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors self-start"
      >
        {submitting ? "Creating..." : "Create & Queue for Build"}
      </button>
      <p className="text-xs text-gray-500">
        This queues the mockup + video build. It will never auto-email — you call or email this one yourself.
      </p>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, rows,
}: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <textarea
        className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm font-mono"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
