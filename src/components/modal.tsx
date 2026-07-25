"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const modalStack: symbol[] = [];
let lockedBodyCount = 0;
let originalBodyOverflow = "";

const classes = (...values: Array<string | false | undefined>): string =>
  values.filter(Boolean).join(" ");

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  title,
  description,
  leading,
  headerActions,
  children,
  footer,
  onClose,
  size = "md",
  layer = "base",
  role = "dialog",
  showHeader = true,
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  panelClassName,
  titleClassName,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: keyof typeof sizeClasses;
  layer?: "base" | "nested";
  role?: "dialog" | "alertdialog";
  showHeader?: boolean;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  panelClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const instance = useRef(Symbol("modal"));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setPortalTarget(document.body), []);

  useEffect(() => {
    const modalId = instance.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(modalId);

    if (lockedBodyCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockedBodyCount += 1;

    const focusPanel = window.requestAnimationFrame(() => panelRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== modalId) return;

      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hidden && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusPanel);
      document.removeEventListener("keydown", handleKeyDown);
      const index = modalStack.lastIndexOf(modalId);
      if (index >= 0) modalStack.splice(index, 1);

      lockedBodyCount = Math.max(0, lockedBodyCount - 1);
      if (lockedBodyCount === 0) document.body.style.overflow = originalBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [closeOnEscape]);

  const modal = (
    <div
      className={classes(
        "modal-backdrop fixed inset-0 flex items-center justify-center bg-black/15 p-3 backdrop-blur-[2px] sm:p-5",
        layer === "nested" ? "z-[60]" : "z-50",
      )}
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          event.currentTarget === event.target &&
          modalStack.at(-1) === instance.current
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={classes(
          "modal-panel flex max-h-[min(46rem,calc(100svh-1.5rem))] w-full flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white text-[#1d1d1f] shadow-[0_20px_55px_rgba(0,0,0,0.18)] outline-none sm:max-h-[min(46rem,calc(100svh-2.5rem))]",
          sizeClasses[size],
          panelClassName,
        )}
      >
        {showHeader ? (
          <header className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            {leading ? <div className="shrink-0">{leading}</div> : null}
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className={classes(
                  "truncate font-semibold text-[#1d1d1f]",
                  titleClassName ?? "text-[15px] leading-5",
                )}
              >
                {title}
              </h2>
              {description ? (
                <div
                  id={descriptionId}
                  className="mt-0.5 truncate text-xs leading-5 text-[#6e6e73]"
                >
                  {description}
                </div>
              ) : null}
            </div>
            {headerActions ? (
              <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
            ) : null}
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                title="Close"
                className="flex size-7 shrink-0 items-center justify-center text-[#86868b] transition hover:text-[#1d1d1f]"
              >
                <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
              </button>
            ) : null}
          </header>
        ) : (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}

        <div className={classes("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 pb-4 pt-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return portalTarget ? createPortal(modal, portalTarget) : null;
}
