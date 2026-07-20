"use client";

import { BarChart3, FileText, LayoutDashboard, ServerCog } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Providers", icon: ServerCog },
  { name: "Usage", icon: BarChart3 },
  { name: "API reference", icon: FileText, href: "/dashboard/api-reference" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard navigation" className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href
          ? item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href)
          : false;
        const content = (
          <>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{item.name}</span>
          </>
        );

        if (!item.href) {
          return (
            <div
              key={item.name}
              aria-disabled="true"
              className="flex h-10 cursor-default items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#98a2b3]"
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
            className={
              isActive
                ? "flex h-10 items-center gap-3 rounded-lg bg-[#f1f5f9] px-3 text-sm font-medium text-[#0f172a]"
                : "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#667085] transition hover:bg-[#f8fafc] hover:text-[#111827]"
            }
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
