import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@attendly/ui/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/stripe/connect/callback?accountId=...&organizationId=...
 * Handles the return from Stripe Connect onboarding.
 */
export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get("accountId");
    const organizationId = request.nextUrl.searchParams.get("organizationId");

    if (!accountId || !organizationId) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Retrieve the Stripe account to check onboarding status
    const account = await stripe.accounts.retrieve(accountId);

    if (account.charges_enabled) {
      // Update the org's stripe_account_id using service role to bypass RLS
      const { createClient: createAdminClient } = await import(
        "@supabase/supabase-js"
      );
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await adminSupabase
        .from("organizations")
        .update({ stripe_account_id: accountId })
        .eq("id", organizationId);
    }

    // Find the most recent event for this org to redirect to its payout page
    const { createClient: createAdminClient } = await import(
      "@supabase/supabase-js"
    );
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: org } = await adminSupabase
      .from("organizations")
      .select("slug")
      .eq("id", organizationId)
      .single();

    const { data: recentEvent } = await adminSupabase
      .from("events")
      .select("id")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentEvent && org) {
      return NextResponse.redirect(
        new URL(`/org/${org.slug}/events/${recentEvent.id}/payout`, request.url)
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Stripe Connect callback error:", error);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
