"use client";

import { ChevronDown, Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FloatingInput } from "./floating-input";

type FilterOption = {
  label: string;
  value: string;
};

export function TableFilter({
  label,
  parameter,
  defaultValue = "",
  placeholder,
  options,
  align = "left",
}: {
  label: string;
  parameter: string;
  defaultValue?: string;
  placeholder?: string;
  options?: FilterOption[];
  align?: "left" | "right";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentValue = searchParams.get(parameter) ?? defaultValue;
  const [draft, setDraft] = useState(currentValue);
  const [open, setOpen] = useState(false);
  const active = currentValue !== defaultValue;
  const clearable = options ? active : Boolean(draft);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const navigate = useCallback(
    (value: string, close = true) => {
      const nextParams = new URLSearchParams(searchParams);
      if (value && value !== defaultValue) nextParams.set(parameter, value);
      else nextParams.delete(parameter);
      nextParams.delete("page");
      const query = nextParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
      if (close) setOpen(false);
    },
    [defaultValue, parameter, pathname, router, searchParams],
  );

  useEffect(() => {
    if (!open || options || draft.trim() === currentValue) return;

    const timeout = window.setTimeout(() => navigate(draft.trim(), false), 300);
    return () => window.clearTimeout(timeout);
  }, [currentValue, draft, navigate, open, options]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setDraft(currentValue);
          setOpen((value) => !value);
        }}
        className={
          active
            ? "inline-flex items-center gap-1.5 text-[#0369a1]"
            : "inline-flex items-center gap-1.5 text-[#667085] transition hover:text-[#344054]"
        }
      >
        <span>{label}</span>
        <Filter className="size-3.5" fill={active ? "currentColor" : "none"} aria-hidden="true" />
      </button>

      {open ? (
        <div
          className={`absolute top-full z-30 mt-2 w-64 rounded-lg border border-[#e5e7eb] bg-white p-3 text-left normal-case tracking-normal shadow-[0_12px_28px_rgba(15,23,42,0.14)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <span className="relative block">
            {options ? (
              <select
                aria-label={label}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  navigate(event.target.value);
                }}
                className="h-9 w-full appearance-none rounded-lg border border-[#d0d5dd] bg-white py-0 pl-3 pr-9 text-sm font-normal text-[#344054] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#bae6fd]"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <FloatingInput
                label={label}
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={placeholder}
                containerClassName="w-full"
                inputClassName="h-10 pr-8 pt-4 font-normal"
              />
            )}
            {clearable ? (
              <button
                type="button"
                aria-label={`Clear ${label.toLowerCase()} filter`}
                onClick={() => {
                  setDraft(defaultValue);
                  navigate(defaultValue);
                }}
                className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-[#98a2b3] transition hover:text-[#344054]"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : options ? (
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#667085]"
                aria-hidden="true"
              />
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
