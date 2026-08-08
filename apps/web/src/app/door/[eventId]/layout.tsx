export default function DoorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-white">
      {children}
    </div>
  );
}
