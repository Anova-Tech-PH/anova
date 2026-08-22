import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@attendly/ui/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/stripe/connect
 * Creates a Stripe Connect account for an organization (if needed)
 * and returns the accountId for embedded onboarding.
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

    if (!accountId) {
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: "stripe" },
          fees: { payer: "account" },
          stripe_dashboard: { type: "full" },
          requirement_collection: "stripe",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
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

    return NextResponse.json({ accountId });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Stripe Connect" },
      { status: 500 }
    );
  }
}
