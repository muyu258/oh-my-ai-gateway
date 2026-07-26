"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

const OVERFLOW_TOLERANCE = 1;

export function OverflowTooltipProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={100}>
      {children}
    </Tooltip.Provider>
  );
}

export function OverflowTooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactElement;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [open, setOpen] = useState(false);

  const updateOverflow = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const target = trigger.querySelector<HTMLElement>("[data-overflow-target]") ?? trigger;

    const nextOverflowing =
      target.scrollWidth > target.clientWidth + OVERFLOW_TOLERANCE ||
      target.scrollHeight > target.clientHeight + OVERFLOW_TOLERANCE;
    setOverflowing(nextOverflowing);
    if (!nextOverflowing) setOpen(false);
  }, []);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const target = trigger.querySelector<HTMLElement>("[data-overflow-target]") ?? trigger;

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(target);
    return () => observer.disconnect();
  }, [content, updateOverflow]);

  return (
    <Tooltip.Root
      open={open}
      onOpenChange={(nextOpen) => setOpen(nextOpen && overflowing)}
      disableHoverableContent
    >
      <Tooltip.Trigger ref={triggerRef} asChild>
        {children}
      </Tooltip.Trigger>
      {overflowing ? (
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={7}
            collisionPadding={10}
            className="z-[80] max-w-[min(28rem,calc(100vw-1.25rem))] break-all rounded-md bg-[#1f2937] px-2.5 py-1.5 text-xs font-normal leading-5 text-white shadow-[0_8px_24px_rgba(15,23,42,0.22)]"
          >
            {content}
            <Tooltip.Arrow className="fill-[#1f2937]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      ) : null}
    </Tooltip.Root>
  );
}
