import { redirect } from "next/navigation";
import { checkUserExistsByEmail } from "@/features/attendee/actions";
import { SetupForm } from "./setup-form";

export default async function AuthSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>;
}) {
  const { email, redirect: redirectTo } = await searchParams;

  if (!email) {
    redirect("/signup");
  }

  const userExists = await checkUserExistsByEmail(email);

  if (userExists) {
    const loginParams = new URLSearchParams();
    loginParams.set("email", email);
    if (redirectTo) loginParams.set("redirect", redirectTo);
    redirect(`/login?${loginParams.toString()}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SetupForm email={email} redirectTo={redirectTo} />
    </div>
  );
}
