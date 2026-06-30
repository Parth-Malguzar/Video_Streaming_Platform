import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

// Define which routes require authentication
const PROTECTED_ROUTES = ["/studio", "/api/studio"];
// Define which routes require admin rights
const ADMIN_ROUTES = ["/admin", "/api/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Read NextAuth token from cookie (handles both development and production cookie names)
  const tokenCookie = request.cookies.get("authjs.session-token") || 
                      request.cookies.get("__Secure-authjs.session-token");
  const token = tokenCookie?.value;

  // 2. Decode the token using NextAuth JWT helper
  let decoded = null;
  if (token && tokenCookie) {
    try {
      decoded = await decode({
        token,
        secret: process.env.AUTH_SECRET!,
        salt: tokenCookie.name,
      });
    } catch (error) {
      console.error("Error decoding NextAuth token in middleware:", error);
    }
  }

  // Check if target path starts with any protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  // 3. Unauthorized checks (No valid token)
  if ((isProtectedRoute || isAdminRoute) && !decoded) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Forbidden checks (Has token, but is not Admin on an Admin route)
  if (isAdminRoute && decoded && decoded.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Access denied: Administrator privileges required" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Append user details to Request Headers (for downstream API handlers to use)
  const requestHeaders = new Headers(request.headers);
  if (decoded) {
    requestHeaders.set("x-user-id", decoded.id as string);
    requestHeaders.set("x-user-email", decoded.email as string);
    requestHeaders.set("x-user-role", decoded.role as string);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/admin/:path*",
    "/api/studio/:path*",
    "/api/admin/:path*",
  ],
};
