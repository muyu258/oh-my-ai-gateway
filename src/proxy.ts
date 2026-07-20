import { AUTH_COOKIE_NAME, isValidGatewayToken } from "#/auth/auth";
import { NextRequest, NextResponse } from "next/server";

const isPublicPath = (pathname: string): boolean =>
  pathname === "/auth" ||
  pathname === "/logo.svg" ||
  pathname === "/api/auth/login" ||
  pathname === "/api/auth/logout";

const isGatewayApiPath = (pathname: string): boolean =>
  pathname === "/v1" || pathname.startsWith("/v1/");

const unauthorizedResponse = (request: NextRequest): NextResponse => {
  const acceptsHtml =
    (request.method === "GET" || request.method === "HEAD") &&
    request.headers.get("accept")?.includes("text/html");

  if (acceptsHtml) {
    const response = NextResponse.redirect(new URL("/auth", request.url));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  return NextResponse.json(
    { error: { code: "unauthorized", message: "Authentication required" } },
    { status: 401, headers: { "Cache-Control": "private, no-store" } },
  );
};

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname) || isGatewayApiPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!isValidGatewayToken(token)) return unauthorizedResponse(request);

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
