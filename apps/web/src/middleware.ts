import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Embed routes: allow iframe embedding and skip auth
  if (pathname.startsWith("/embed/")) {
    const response = NextResponse.next({ request });
    response.headers.delete("X-Frame-Options");
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    return response;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect organizer routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/events")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect /my-events — requires auth, no org needed
  if (pathname.startsWith("/my-events")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", "/my-events");
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    if (user) {
      const redirect = request.nextUrl.searchParams.get("redirect");
      if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
        return NextResponse.redirect(new URL(redirect, request.url));
      }
      // Check if user is an organizer (has org membership)
      const { count } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const url = request.nextUrl.clone();
      url.pathname = count && count > 0 ? "/dashboard" : "/my-events";
      return NextResponse.redirect(url);
    }
  }

  // Allow onboarding page for logged-in users without an org
  if (pathname.startsWith("/onboarding")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    // Check if user already has an org — if so, redirect to dashboard
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count > 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect portal routes (/:orgSlug/:eventSlug/...) — require login
  const portalPattern = /^\/[^/]+\/[^/]+/;
  const isPortalRoute =
    portalPattern.test(pathname) &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/events") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/embed/") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/register") &&
    !pathname.startsWith("/kiosk") &&
    !pathname.startsWith("/present") &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/my-events");

  if (isPortalRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect users without an org to onboarding (for protected organizer routes)
  if (
    user &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/events"))
  ) {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!count || count === 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
