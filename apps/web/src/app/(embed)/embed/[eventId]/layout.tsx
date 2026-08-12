export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="embed-body min-h-0">
      {children}
    </div>
  );
}
