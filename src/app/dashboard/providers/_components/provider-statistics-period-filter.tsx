"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ProviderStatisticsPeriod } from "#/lib/database/provider.repository";

const options: Array<{ label: string; value: ProviderStatisticsPeriod }> = [
  { label: "Last 30 minutes", value: "30m" },
  { label: "Last hour", value: "1h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

export function ProviderStatisticsPeriodFilter({ value }: { value: ProviderStatisticsPeriod }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = (period: ProviderStatisticsPeriod) => {
    const nextParams = new URLSearchParams(searchParams);
    if (period === "30m") nextParams.delete("period");
    else nextParams.set("period", period);
    nextParams.delete("responseTimePeriod");
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <label className="relative flex h-10 items-center rounded-lg border border-[#d0d5dd] bg-white pl-3 pr-9 text-sm font-medium text-[#344054] transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#bae6fd] hover:bg-[#f9fafb]">
      <CalendarRange className="mr-2 size-4 shrink-0 text-[#667085]" aria-hidden="true" />
      <select
        aria-label="Statistics period"
        value={value}
        onChange={(event) => navigate(event.target.value as ProviderStatisticsPeriod)}
        className="absolute inset-0 size-full cursor-pointer appearance-none bg-transparent pl-9 pr-9 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none invisible whitespace-nowrap" aria-hidden="true">
        Last 30 minutes
      </span>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-4 text-[#667085]"
        aria-hidden="true"
      />
    </label>
  );
}
