import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { LeadActions } from "@/components/LeadActions";
import type { Lead, OutreachMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: lead }, { data: messages }] = await Promise.all([
    db.from("leads").select("*").eq("id", id).single(),
    db.from("outreach_messages").select("*").eq("lead_id", id).order("sent_at", { ascending: true }),
  ]);

  if (!lead) return <main className="p-6 text-gray-400">Lead not found</main>;

  const l = lead as Lead;

  return (
    <main className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <Link href="/leads" className="text-gray-500 hover:text-gray-300 text-sm">Leads</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">{l.business_name}</h1>
        <div className="ml-auto">
          <StatusBadge status={l.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Section title="Business Info">
          <Field label="City" value={l.city} />
          <Field label="Niche" value={l.niche} />
          <Field label="Phone" value={l.phone} />
          <Field label="Email" value={l.email} />
          <Field label="Website" value={l.website_url} link />
          <Field label="Reviews" value={l.review_count?.toString()} />
          <Field label="Rating" value={l.rating?.toString()} />
          <Field label="Priority Score" value={`${l.priority_score}/10`} />
        </Section>

        <Section title="Assets">
          <Field label="Mockup" value={l.lovable_url} link />
          <Field label="Video" value={l.video_url} link />
        </Section>
      </div>

      {l.diagnosis && (
        <Section title="Diagnosis" className="mb-6">
          <p className="text-gray-300 text-sm">{l.diagnosis}</p>
        </Section>
      )}

      {l.outreach_angle && (
        <Section title="Outreach Angle" className="mb-6">
          <p className="text-gray-300 text-sm">{l.outreach_angle}</p>
        </Section>
      )}

      {l.cold_message && (
        <Section title="Cold Message" className="mb-6">
          <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{l.cold_message}</pre>
        </Section>
      )}

      {l.site_brief && (
        <Section title="Site Brief" className="mb-6">
          <p className="text-gray-300 text-sm">{l.site_brief}</p>
        </Section>
      )}

      {messages?.length ? (
        <Section title="Outreach History">
          <div className="flex flex-col gap-3">
            {(messages as OutreachMessage[]).map((msg) => (
              <div key={msg.id} className="bg-gray-900 rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs">
                  <span>{new Date(msg.sent_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>Follow-up #{msg.follow_up_number}</span>
                </div>
                <div className="font-medium mb-1">{msg.subject}</div>
                <pre className="text-gray-400 text-xs whitespace-pre-wrap font-sans">{msg.body}</pre>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <LeadActions leadId={id} />
    </main>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm mb-1">
      <span className="text-gray-500 w-28 shrink-0">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-gray-300">{value}</span>
      )}
    </div>
  );
}

