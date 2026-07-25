"use client";

import { CalendarRange } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "#/components/select";
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
    <Select
      ariaLabel="Statistics period"
      value={value}
      onValueChange={navigate}
      options={options}
      icon={<CalendarRange className="size-4" aria-hidden="true" />}
      className="w-[190px]"
    />
  );
}
