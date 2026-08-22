import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@attendly/ui/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/stripe/account-session
 * Creates an AccountSession for embedded onboarding components.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json({ client_secret: accountSession.client_secret });
  } catch (error) {
    console.error("Account session error:", error);
    return NextResponse.json(
      { error: "Failed to create account session" },
      { status: 500 }
    );
  }
}
