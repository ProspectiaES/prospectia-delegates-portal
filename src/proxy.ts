import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyClientSession, CLIENT_SESSION_COOKIE } from "@/lib/clientSession";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── Client portal (NIF/CIF session) — fully independent of Supabase auth ──
  if (path.startsWith("/cliente")) {
    const session = await verifyClientSession(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
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

  // getUser() validates the token server-side and refreshes if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated: protect root and all dashboard routes
  if (!user && (path === "/" || path.startsWith("/dashboard"))) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // Authenticated: bounce away from login page and root
  if (user && (path === "/login" || path === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  // No staff session — an already-logged-in client shouldn't see the login form
  if (!user && path === "/login") {
    const clientSession = await verifyClientSession(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
    if (clientSession) return NextResponse.redirect(new URL("/cliente", request.nextUrl));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
