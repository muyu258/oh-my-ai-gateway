"use client";

import { Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FloatingInput } from "./floating-input";
import { Select } from "./select";

type FilterOption = {
  label: string;
  value: string;
};

const MENU_WIDTH = 256;
const MENU_GAP = 8;
const VIEWPORT_MARGIN = 8;

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentValue = searchParams.get(parameter) ?? defaultValue;
  const [draft, setDraft] = useState(currentValue);
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const active = currentValue !== defaultValue;
  const clearable = options ? active : Boolean(draft);

  useEffect(() => setPortalTarget(document.body), []);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menu = menuRef.current;
    const menuWidth = menu?.offsetWidth || MENU_WIDTH;
    const menuHeight = menu?.offsetHeight || 0;
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - menuWidth - VIEWPORT_MARGIN);
    const preferredLeft = align === "right" ? triggerRect.right - menuWidth : triggerRect.left;
    const left = Math.min(Math.max(preferredLeft, VIEWPORT_MARGIN), maxLeft);
    const preferredTop = triggerRect.bottom + MENU_GAP;
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - menuHeight - VIEWPORT_MARGIN);
    const top = Math.min(
      Math.max(
        menuHeight > 0 && preferredTop + menuHeight > window.innerHeight - VIEWPORT_MARGIN
          ? triggerRect.top - MENU_GAP - menuHeight
          : preferredTop,
        VIEWPORT_MARGIN,
      ),
      maxTop,
    );

    setMenuPosition((position) =>
      position?.top === top && position.left === left ? position : { top, left },
    );
  }, [align]);

  useLayoutEffect(() => {
    if (!open || !portalTarget) return;

    updateMenuPosition();
    const frame = window.requestAnimationFrame(updateMenuPosition);
    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, portalTarget, updateMenuPosition]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      const inSelectContent =
        target instanceof Element && Boolean(target.closest("[data-select-content]"));
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target) &&
        !inSelectContent
      ) {
        setOpen(false);
        setMenuPosition(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMenuPosition(null);
      }
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
      if (close) {
        setOpen(false);
        setMenuPosition(null);
      }
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
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setDraft(currentValue);
          setMenuPosition(null);
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

      {open && portalTarget
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-30 w-64 rounded-lg border border-[#e5e7eb] bg-white p-3 text-left normal-case tracking-normal shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
              style={
                menuPosition
                  ? { top: menuPosition.top, left: menuPosition.left }
                  : { top: 0, left: 0, visibility: "hidden" }
              }
            >
              <span className="relative block">
                {options ? (
                  <Select
                    ariaLabel={label}
                    value={draft}
                    onValueChange={(value) => {
                      setDraft(value);
                      navigate(value);
                    }}
                    options={options}
                    size="sm"
                    className={`w-full font-normal ${clearable ? "pr-9" : ""}`}
                    hideChevron={clearable}
                  />
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
                ) : null}
              </span>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
