import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

async function getFirstOrgSlug(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return (data?.organizations as any)?.slug ?? null;
}

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

  // Redirect old organizer routes to org-scoped ones
  if (
    user &&
    (pathname === "/dashboard" ||
     pathname === "/events" ||
     pathname.startsWith("/events/") ||
     pathname === "/settings" ||
     pathname.startsWith("/settings/"))
  ) {
    const slug = await getFirstOrgSlug(supabase, user.id);
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/org/${slug}${pathname}`;
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // Protect /org/* routes — require auth
  if (pathname.startsWith("/org/")) {
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
      // Redirect to org-scoped dashboard or my-events
      const slug = await getFirstOrgSlug(supabase, user.id);
      const url = request.nextUrl.clone();
      url.pathname = slug ? `/org/${slug}/dashboard` : "/my-events";
      return NextResponse.redirect(url);
    }
  }

  // Allow onboarding page for logged-in users
  if (pathname.startsWith("/onboarding")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    // Allow if ?new=1 (creating additional org) — skip redirect
    const isCreatingNew = request.nextUrl.searchParams.get("new") === "1";
    if (!isCreatingNew) {
      // Check if user already has an org — if so, redirect to org dashboard
      const slug = await getFirstOrgSlug(supabase, user.id);
      if (slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/org/${slug}/dashboard`;
        return NextResponse.redirect(url);
      }
    }
  }

  // Protect portal routes (/:orgSlug/:eventSlug/...) — require login
  const portalPattern = /^\/[^/]+\/[^/]+/;
  const isPortalRoute =
    portalPattern.test(pathname) &&
    !pathname.startsWith("/org/") &&
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
