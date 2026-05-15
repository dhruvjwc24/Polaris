import { CampaignForm } from "@/components/CampaignForm";

export default function NewCampaignPage() {
  return (
    <main className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-6">New Campaign</h1>
      <CampaignForm />
    </main>
  );
}
