import { AUTH_COOKIE_NAME, isValidGatewayToken } from "#/auth/auth";
import { NextResponse } from "next/server";

export const POST = async (request: Request): Promise<NextResponse> => {
  const formData = await request.formData();
  const token = formData.get("token");

  if (!isValidGatewayToken(token)) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(authUrl, 303);
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
};
