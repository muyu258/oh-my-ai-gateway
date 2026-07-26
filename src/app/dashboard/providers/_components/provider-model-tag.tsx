import type { ReactNode } from "react";

type ProviderModelTagProps = {
  children: string;
  tone: "neutral" | "accent" | "muted";
  width: "content" | "fixed";
  disabled?: boolean;
  leadingIcon?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  ariaLabel?: string;
  title?: string;
};

const toneClasses: Record<ProviderModelTagProps["tone"], string> = {
  neutral: "bg-white text-[#344054] ring-[#e4e7ec]",
  accent: "bg-[#e0f2fe] text-[#0369a1] ring-[#7dd3fc]",
  muted: "bg-[#f2f4f7] text-[#667085] ring-[#e4e7ec]",
};

export function ProviderModelTag({
  children,
  tone,
  width,
  disabled = false,
  leadingIcon,
  actions,
  onClick,
  pressed,
  ariaLabel,
  title,
}: ProviderModelTagProps) {
  const content = (
    <>
      {leadingIcon !== undefined ? (
        <span className="flex size-4 shrink-0 items-center justify-center">{leadingIcon}</span>
      ) : null}
      <span
        className={`min-w-0 break-all leading-4 ${width === "content" ? "max-w-72" : "flex-1"}`}
      >
        {children}
      </span>
    </>
  );
  const primaryClasses = `flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0284c7] ${actions ? "pr-12" : ""}`;
  const interactionClasses =
    onClick && !disabled
      ? tone === "neutral"
        ? "cursor-pointer hover:bg-[#f9fafb]"
        : tone === "accent"
          ? "cursor-pointer hover:bg-[#bae6fd]"
          : "cursor-pointer"
      : "cursor-default";

  return (
    <span
      data-provider-model-tag
      className={`group relative inline-flex h-7 max-w-full items-stretch rounded-md font-mono text-[11px] shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-inset transition-colors ${width === "fixed" ? "w-56" : "w-fit"} ${toneClasses[tone]} ${interactionClasses} ${disabled && tone !== "muted" ? "opacity-60" : ""}`}
    >
      {onClick ? (
        <button
          type="button"
          disabled={disabled}
          aria-pressed={pressed}
          aria-label={ariaLabel}
          title={title}
          onClick={onClick}
          className={`${primaryClasses} flex-1 disabled:cursor-default`}
        >
          {content}
        </button>
      ) : (
        <span className={primaryClasses} title={title}>
          {content}
        </span>
      )}
      {actions ? (
        <span className="absolute right-1 top-1 flex items-center gap-0.5">{actions}</span>
      ) : null}
    </span>
  );
}
