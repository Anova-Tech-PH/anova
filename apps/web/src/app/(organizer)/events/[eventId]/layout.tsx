import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { notFound } from "next/navigation";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>
      {children}
    </div>
  );
}
