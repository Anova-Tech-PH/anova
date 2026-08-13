import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/features/emails/lib/unsubscribe";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const payload = await verifyUnsubscribeToken(token);
    const supabase = getServiceClient();

    if (payload.contactListId) {
      await supabase
        .from("contacts")
        .update({ unsubscribed: true })
        .eq("contact_list_id", payload.contactListId)
        .eq("email", payload.email);
    } else if (payload.registrationId) {
      await supabase
        .from("registrations")
        .update({ unsubscribed: true })
        .eq("id", payload.registrationId);
    }

    // Also expire any pending registration intents for this email
    // so they stop receiving recovery emails
    await supabase
      .from("registration_intents")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("email", payload.email)
      .eq("status", "pending");

    return new Response(
      `<!DOCTYPE html>
      <html><head><title>Unsubscribed</title>
      <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}
      .card{background:white;padding:2rem 3rem;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center}
      h1{color:#16a34a;margin-bottom:0.5rem}p{color:#6b7280}</style></head>
      <body><div class="card"><h1>Unsubscribed</h1><p>You've been successfully unsubscribed from future emails.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return new Response(
      `<!DOCTYPE html>
      <html><head><title>Error</title>
      <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}
      .card{background:white;padding:2rem 3rem;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center}
      h1{color:#dc2626;margin-bottom:0.5rem}p{color:#6b7280}</style></head>
      <body><div class="card"><h1>Invalid Link</h1><p>This unsubscribe link is invalid or has expired.</p></div></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }
}
