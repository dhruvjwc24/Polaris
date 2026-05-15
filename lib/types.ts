export interface SiteService {
  name: string;
  desc: string;
}

export interface SiteStructure {
  headline: string;
  tagline: string;
  services: SiteService[];
  about: string;
  cta: string;
}

export type LeadStatus =
  | "new" | "enriched" | "brief_ready"
  | "mockup_building" | "mockup_ready"
  | "video_building" | "video_ready"
  | "outreach_sent" | "followed_up_1" | "followed_up_2"
  | "replied" | "positive" | "call_scheduled"
  | "closed" | "archived";

export type LeadSource = "google_places" | "manual";
export type OutreachChannel = "email" | "sms" | "linkedin";
export type CallOutcome = "no_show" | "not_interested" | "follow_up" | "closed";

export interface Lead {
  id: string;
  campaign_id: string | null;
  business_name: string;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  city: string;
  niche: string;
  google_maps_id: string | null;
  review_count: number | null;
  rating: number | null;
  years_established: number | null;
  source: LeadSource;
  diagnosis: string | null;
  outreach_angle: string | null;
  gap_analysis: string | null;
  site_brief: string | null;
  cold_message: string | null;
  site_structure: SiteStructure | null;
  lovable_url: string | null;
  screenshot_paths: string[] | null;
  video_url: string | null;
  status: LeadStatus;
  priority_score: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  niche: string;
  city: string;
  created_at: string;
}

export interface OutreachMessage {
  id: string;
  lead_id: string;
  channel: OutreachChannel;
  subject: string | null;
  body: string;
  follow_up_number: number;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
  sent_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  scheduled_at: string | null;
  outcome: CallOutcome | null;
  deal_value: number | null;
  notes: string | null;
  created_at: string;
}
