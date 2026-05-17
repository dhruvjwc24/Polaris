import type { LeadStatus } from "@/lib/types";

const colors: Record<LeadStatus, string> = {
  new: "bg-gray-700 text-gray-300",
  enriched: "bg-blue-900 text-blue-300",
  brief_ready: "bg-blue-800 text-blue-200",
  mockup_building: "bg-yellow-900 text-yellow-300",
  mockup_ready: "bg-yellow-800 text-yellow-200",
  video_building: "bg-orange-900 text-orange-300",
  video_ready: "bg-orange-800 text-orange-200",
  outreach_sent: "bg-purple-900 text-purple-300",
  followed_up_1: "bg-purple-800 text-purple-200",
  followed_up_2: "bg-purple-700 text-purple-100",
  replied: "bg-teal-900 text-teal-300",
  positive: "bg-green-900 text-green-300",
  call_scheduled: "bg-green-800 text-green-200",
  closed: "bg-green-600 text-white",
  archived: "bg-gray-800 text-gray-500",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
