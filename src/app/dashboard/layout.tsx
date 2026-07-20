import { LogOut } from "lucide-react";
import Image from "next/image";

import Navigation from "./_components/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

const Brand = () => (
  <div className="flex min-w-0 items-center gap-3">
    <Image src="/logo.svg" alt="" width={30} height={30} />
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[#111827]">Oh My AI Gateway</p>
    </div>
  </div>
);

const LogoutForm = () => (
  <form action="/api/auth/logout" method="post">
    <button
      type="submit"
      className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#667085] transition hover:bg-[#f8fafc] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
    >
      <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>Sign out</span>
    </button>
  </form>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-white text-[#111827] md:flex-row">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4 md:hidden">
        <Brand />

        <details className="group relative">
          <div className="absolute right-0 top-12 z-20 w-64 rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-[0_14px_35px_rgba(15,23,42,0.12)]">
            <Navigation />
            <div className="mt-2 border-t border-[#e5e7eb] pt-2">
              <LogoutForm />
            </div>
          </div>
        </details>
      </header>

      <aside className="h-full w-64 shrink-0 flex-col border-r border-[#e5e7eb] bg-white p-4">
        <div className="px-2 py-1">
          <Brand />
        </div>
        <div className="mt-8">
          <Navigation />
        </div>
        <div className="mt-auto ">
          <LogoutForm />
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto flex">{children}</main>
    </div>
  );
}
