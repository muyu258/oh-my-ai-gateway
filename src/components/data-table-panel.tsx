"use client";

import type { ReactNode, UIEvent } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

const classes = (...values: Array<string | undefined>): string => values.filter(Boolean).join(" ");

const HORIZONTAL_OVERFLOW_TOLERANCE = 1;

const hasHiddenContentToRight = (
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): boolean => scrollLeft + clientWidth < scrollWidth - HORIZONTAL_OVERFLOW_TOLERANCE;

const hasHiddenContentToLeft = (scrollLeft: number): boolean =>
  scrollLeft > HORIZONTAL_OVERFLOW_TOLERANCE;

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
  const bodyViewportRef = useRef<HTMLDivElement>(null);
  const bodyContentRef = useRef<HTMLDivElement>(null);
  const [hiddenContentToLeft, setHiddenContentToLeft] = useState(false);
  const [hiddenContentToRight, setHiddenContentToRight] = useState(false);

  const updatePinnedBoundary = useCallback((viewport: HTMLDivElement) => {
    setHiddenContentToLeft(hasHiddenContentToLeft(viewport.scrollLeft));
    setHiddenContentToRight(
      hasHiddenContentToRight(viewport.scrollLeft, viewport.clientWidth, viewport.scrollWidth),
    );
  }, []);

  useLayoutEffect(() => {
    const viewport = bodyViewportRef.current;
    const content = bodyContentRef.current;
    if (!viewport || !content) return;

    const update = () => updatePinnedBoundary(viewport);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [minWidth, updatePinnedBoundary]);

  const syncHeader = (event: UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = event.currentTarget;
    // Header and body are separate viewports so the header can stay fixed while rows scroll.
    if (headerViewportRef.current) {
      headerViewportRef.current.scrollLeft = scrollLeft;
    }
    updatePinnedBoundary(event.currentTarget);
  };

  return (
    <section
      data-hidden-left={hiddenContentToLeft || undefined}
      data-hidden-right={hiddenContentToRight || undefined}
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
        ref={bodyViewportRef}
        className="data-table-scroll min-h-0 flex-1 overflow-auto overscroll-contain"
        onScroll={syncHeader}
      >
        <div ref={bodyContentRef} className="flex min-h-full flex-col" style={{ minWidth }}>
          {children}
        </div>
      </div>
      {footer ? (
        <footer className="flex h-14 shrink-0 items-center justify-between gap-4 border-t border-black/[0.08] bg-white/95 px-4 backdrop-blur-xl sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
