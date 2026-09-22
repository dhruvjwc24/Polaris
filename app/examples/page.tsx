import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { ExamplesList } from "@/components/ExamplesList";
import type { ReferenceExample } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExamplesPage() {
  const { data: examples } = await db
    .from("reference_examples")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">Example Websites</h1>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        Well-built reference sites to pull up live on a call or Zoom — "I can build you this too."
        Good for showing what a multi-page site can look like (nav tabs for Services, Financing,
        Service Areas, a Blog, etc.) when the mockup itself is generic.
      </p>

      <ExamplesList examples={(examples ?? []) as ReferenceExample[]} />
    </main>
  );
}
