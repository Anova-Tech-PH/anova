import { createClient } from "@attendly/ui/supabase/server";
import { stripe } from "@/lib/stripe";

export async function getStripeConnectionStatus(organizationId: string) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", organizationId)
    .single();

  if (!org?.stripe_account_id) {
    return { connected: false, accountId: null, chargesEnabled: false, email: null };
  }

  try {
    const account = await stripe.accounts.retrieve(org.stripe_account_id);
    return {
      connected: true,
      accountId: org.stripe_account_id,
      chargesEnabled: account.charges_enabled ?? false,
      email: account.email ?? null,
    };
  } catch {
    return { connected: false, accountId: org.stripe_account_id, chargesEnabled: false, email: null };
  }
}
