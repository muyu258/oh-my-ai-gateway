import { AUTH_COOKIE_NAME } from "#/lib/auth/auth";
import { NextResponse } from "next/server";

export const POST = (request: Request): NextResponse => {
  const response = NextResponse.redirect(new URL("/auth", request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
};
