import { AUTH_COOKIE_NAME, isValidGatewayToken } from "#/auth/auth";
import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cookieStore = await cookies();

  if (isValidGatewayToken(cookieStore.get(AUTH_COOKIE_NAME)?.value)) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-white px-5 py-8 text-[#111827] sm:px-8 sm:py-12">
      <section
        aria-labelledby="auth-title"
        className="w-full max-w-lg rounded-2xl border border-[#e5e7eb] bg-white px-6 py-9 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:px-12 sm:py-12"
      >
        <header className="text-center">
          <Image
            src="/logo.svg"
            alt="Oh My AI Gateway"
            width={64}
            height={64}
            priority
            className="mx-auto h-16 w-16"
          />
          <h1 id="auth-title" className="mt-7 text-3xl font-semibold leading-10 text-[#111827]">
            Welcome back
          </h1>
        </header>

        <form action="/api/auth/login" method="post" className="mt-10">
          <input
            id="token"
            name="token"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            placeholder="Enter your gateway token"
            aria-describedby={error ? "login-error" : undefined}
            className="mt-2 h-14 w-full rounded-lg border border-[#d1d5db] bg-white px-4 font-mono text-base text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#0284c7] focus:ring-2 focus:ring-[#38bdf8]/25"
          />

          {error ? (
            <p
              id="login-error"
              role="alert"
              className="mt-3 rounded-md border border-[#e4b9b4] bg-[#fff4f2] px-4 py-3 text-sm text-[#9c3328]"
            >
              The gateway token is incorrect.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 flex h-14 w-full items-center justify-center rounded-lg bg-[#0f172a] px-4 text-base font-semibold text-white transition hover:bg-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 active:bg-[#020617]"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
