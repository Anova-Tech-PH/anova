import { EventSidebar } from "./event-sidebar";

export default function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <EventSidebar params={params} />
      <main className="flex-1 min-w-0 pt-[57px] lg:pt-0">{children}</main>
    </div>
  );
}
