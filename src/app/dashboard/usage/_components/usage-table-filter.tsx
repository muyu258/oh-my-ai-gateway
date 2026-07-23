"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PageSizeSelect({ value }: { value: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-[#667085]">
      <span>Rows per page</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => {
            const nextParams = new URLSearchParams(searchParams);
            const pageSize = event.target.value;
            if (pageSize === "20") nextParams.delete("pageSize");
            else nextParams.set("pageSize", pageSize);
            nextParams.delete("page");
            const query = nextParams.toString();
            router.push(query ? `${pathname}?${query}` : pathname);
          }}
          className="h-8 appearance-none rounded-md border border-[#d0d5dd] bg-white py-0 pl-2.5 pr-7 text-sm font-medium text-[#344054] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#bae6fd]"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#667085]"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}
