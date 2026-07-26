"use client";

import { FilterX } from "lucide-react";
import { useRouter } from "next/navigation";

export function ClearFiltersButton({ active, href }: { active: boolean; href: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={!active}
      onClick={() => router.push(href)}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:border-[#e5e7eb] disabled:bg-white disabled:text-[#b0b5bd]"
    >
      <FilterX className="size-4" aria-hidden="true" />
      Clear filters
    </button>
  );
}
