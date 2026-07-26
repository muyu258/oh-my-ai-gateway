import { AUTH_COOKIE_NAME, isValidGatewayToken } from "#/lib/auth/auth";
import { FloatingInput } from "#/components/floating-input";
import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign in",
};

async function AuthContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
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
          <FloatingInput
            label="Gateway token"
            id="token"
            name="token"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            placeholder="Enter your gateway token"
            aria-describedby={error ? "login-error" : undefined}
            containerClassName="mt-2"
            inputClassName="h-14 font-mono text-base"
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
            className="mt-6 flex h-14 w-full items-center justify-center rounded-lg bg-[#0f172a] px-4 text-base font-semibold text-white transition hover:bg-[#1e293b] active:bg-[#020617]"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}

export default function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-svh bg-white" />}>
      <AuthContent searchParams={searchParams} />
    </Suspense>
  );
}
