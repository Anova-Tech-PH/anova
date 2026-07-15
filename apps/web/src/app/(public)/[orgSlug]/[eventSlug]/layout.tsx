import Link from "next/link";
import { Logo } from "@/shared/components/logo";

export default function PublicEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </header>
      {children}
    </div>
  );
}
