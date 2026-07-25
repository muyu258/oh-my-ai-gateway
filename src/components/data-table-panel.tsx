"use client";

import type { ReactNode, UIEvent } from "react";
import { useRef, useState } from "react";

const classes = (...values: Array<string | undefined>): string => values.filter(Boolean).join(" ");

export const hasHorizontalScrollOffset = (scrollLeft: number): boolean => scrollLeft > 0;

export function DataTablePanel({
  header,
  children,
  footer,
  minWidth = 960,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  minWidth?: number;
  className?: string;
}) {
  const headerViewportRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const syncHeader = (event: UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = event.currentTarget;
    // Header and body are separate viewports so the header can stay fixed while rows scroll.
    if (headerViewportRef.current) {
      headerViewportRef.current.scrollLeft = scrollLeft;
    }
    // The pinned divider only marks columns hidden beyond the left edge of the body viewport.
    setScrolled(hasHorizontalScrollOffset(scrollLeft));
  };

  return (
    <section
      data-scrolled={scrolled || undefined}
      className={classes(
        "data-table-panel flex h-full min-h-0 w-full flex-col overflow-hidden bg-white",
        className,
      )}
    >
      <div
        ref={headerViewportRef}
        className="z-10 shrink-0 overflow-x-hidden bg-white/95 shadow-[0_1px_0_rgba(0,0,0,0.08)] backdrop-blur-xl"
      >
        <div style={{ minWidth }}>{header}</div>
      </div>
      <div
        className="data-table-scroll min-h-0 flex-1 overflow-auto overscroll-contain"
        onScroll={syncHeader}
      >
        <div style={{ minWidth }}>{children}</div>
      </div>
      {footer ? (
        <footer className="flex h-14 shrink-0 items-center justify-between gap-4 border-t border-black/[0.08] bg-white/95 px-4 backdrop-blur-xl sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
