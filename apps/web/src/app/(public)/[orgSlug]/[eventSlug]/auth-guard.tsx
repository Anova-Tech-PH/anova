import { createClient } from "@attendly/ui/supabase/server";
import { LogIn } from "lucide-react";
import Link from "next/link";

export async function AuthGuard({
  children,
  currentPath,
  title = "Sign in required",
  description = "Sign in to access this feature and connect with other attendees.",
}: {
  children: React.ReactNode;
  currentPath: string;
  title?: string;
  description?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LogIn className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
        <Link
          href={`/login?redirect=${encodeURIComponent(currentPath)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
