import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/tasks",
  "/history",
  "/advance",
  "/reputation",
  "/settings",
];

/**
 * Auth routes (redirect to dashboard if already logged in)
 */
const AUTH_ROUTES = ["/login", "/register"];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/", "/platform"];

/**
 * Check if a path matches any of the route patterns
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (pathname === route) return true;
    // Also handle sub-paths, e.g., /platform/register
    if (route !== '/' && pathname.startsWith(route + "/")) return true;
    return false;
  });
}

/**
 * Middleware function
 * Handles authentication and route protection
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hardcoded rule for debugging: always allow /platform routes
  if (pathname.startsWith('/platform')) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get("auth_token")?.value;
  const isAuthenticated = !!authToken;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Immediately allow public routes
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);

  // Redirect to login if trying to access protected route without auth
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if trying to access auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If a route is not public, not auth, and not explicitly protected,
  // but the user is not authenticated, redirect to login.
  // This acts as a default-deny policy.
  if (!isAuthenticated && !isAuthRoute && !isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
  }

  // Allow request to proceed
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
