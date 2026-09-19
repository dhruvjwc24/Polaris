import { ManualLeadForm } from "@/components/ManualLeadForm";

export default function NewLeadPage() {
  return (
    <main className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-2">Create Website Request</h1>
      <p className="text-sm text-gray-500 mb-6">
        For a company you cold-called and got interested. Paste the Google Maps link to
        auto-fill their details, or enter what you have — I&apos;ll build the mockup and
        video from this, and it&apos;ll show up back in the pipeline when ready.
      </p>
      <ManualLeadForm />
    </main>
  );
}
