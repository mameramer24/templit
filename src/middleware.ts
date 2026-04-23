import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, method } = request;

  // Handle /trigger at the Edge level before any routing
  if (pathname === "/trigger" || pathname === "/trigger/") {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Allow all methods through, add CORS headers to response
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
    return response;
  }

  // For API routes, add CORS headers
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/trigger", "/trigger/:path*", "/api/:path*"],
};
