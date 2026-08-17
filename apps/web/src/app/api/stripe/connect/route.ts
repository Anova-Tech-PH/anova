import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@attendly/ui/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/stripe/connect
 * Initiates Stripe Connect onboarding for an organization.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Verify user is owner or admin of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You must be an owner or admin of this organization" },
        { status: 403 }
      );
    }

    // Check if org already has a Stripe account
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", organizationId)
      .single();

    let accountId = org?.stripe_account_id;

    // Create a new Standard Connect account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({ type: "standard" });
      accountId = account.id;

      // Save account ID using service role to bypass RLS
      const supabaseJs = await import("@supabase/supabase-js");
      const adminSupabase = supabaseJs.createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: updateError } = await adminSupabase
        .from("organizations")
        .update({ stripe_account_id: accountId })
        .eq("id", organizationId);

      if (updateError) {
        console.error("Failed to save Stripe account:", updateError);
        return NextResponse.json(
          { error: "Failed to save Stripe account" },
          { status: 500 }
        );
      }
    }

    // Create an Account Link for onboarding
    const origin = request.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/stripe/connect?organizationId=${organizationId}`,
      return_url: `${origin}/api/stripe/connect/callback?accountId=${accountId}&organizationId=${organizationId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Stripe Connect onboarding" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/connect?organizationId=...
 * Handles the refresh_url case — re-creates the account link and redirects.
 */
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up the org's stripe_account_id
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", organizationId)
      .single();

    if (!org?.stripe_account_id) {
      return NextResponse.json(
        { error: "No Stripe account found for this organization" },
        { status: 404 }
      );
    }

    // Create a new account link and redirect
    const origin = request.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: org.stripe_account_id,
      refresh_url: `${origin}/api/stripe/connect?organizationId=${organizationId}`,
      return_url: `${origin}/api/stripe/connect/callback?accountId=${org.stripe_account_id}&organizationId=${organizationId}`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("Stripe Connect refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh Stripe Connect onboarding" },
      { status: 500 }
    );
  }
}
