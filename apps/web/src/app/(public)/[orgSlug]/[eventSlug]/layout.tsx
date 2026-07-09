export default function PublicEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <span className="text-lg font-semibold">Attendly</span>
      </header>
      {children}
    </div>
  );
}
