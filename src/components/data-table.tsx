import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

const classes = (...values: Array<string | undefined>): string => values.filter(Boolean).join(" ");

export function DataTable({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return <table className={classes("w-full border-collapse", className)} {...props} />;
}

export function DataTableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={classes("sticky top-0 z-10 bg-[#fbfbfd]", className)} {...props} />;
}

export function DataTableHeaderRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={classes(
        "border-b border-[#e5e7eb] text-xs font-medium uppercase text-[#667085]",
        className,
      )}
      {...props}
    />
  );
}

type PinnedCellProps = {
  pinned?: "right";
  pinOffset?: CSSProperties["right"];
  pinnedBoundary?: boolean;
};

export function DataTableHead({
  className,
  pinned,
  pinOffset = 0,
  pinnedBoundary = true,
  style,
  ...props
}: ComponentPropsWithoutRef<"th"> & PinnedCellProps) {
  return (
    <th
      className={classes(
        "px-5 py-3",
        pinned === "right"
          ? "sticky z-20 bg-[#fbfbfd] shadow-[-10px_0_16px_-16px_rgba(0,0,0,0.45)]"
          : undefined,
        pinned === "right" && pinnedBoundary
          ? "after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-[#d1d1d6] after:content-['']"
          : undefined,
        className,
      )}
      style={pinned === "right" ? { ...style, right: pinOffset } : style}
      {...props}
    />
  );
}

export function DataTableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={classes("divide-y divide-[#eef0f3]", className)} {...props} />;
}

export function DataTableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={classes(
        "group text-sm transition-colors duration-150 ease-out hover:bg-[#f7f7f9]",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableCell({
  className,
  pinned,
  pinOffset = 0,
  pinnedBoundary = true,
  style,
  ...props
}: ComponentPropsWithoutRef<"td"> & PinnedCellProps) {
  return (
    <td
      className={classes(
        "px-5 py-4",
        pinned === "right"
          ? "sticky z-[2] bg-white shadow-[-10px_0_16px_-16px_rgba(0,0,0,0.45)] transition-colors duration-150 ease-out group-hover:bg-[#f7f7f9]"
          : undefined,
        pinned === "right" && pinnedBoundary
          ? "after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-[#d1d1d6] after:content-['']"
          : undefined,
        className,
      )}
      style={pinned === "right" ? { ...style, right: pinOffset } : style}
      {...props}
    />
  );
}

export function DataTableEmptyState({
  colSpan,
  icon,
  title,
  description,
  action,
  className,
}: {
  colSpan: number;
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div
          className={classes(
            "flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center",
            className,
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
            {icon}
          </div>
          <h2 className="mt-4 text-sm font-semibold text-[#101828]">{title}</h2>
          <p className="mt-1 max-w-sm text-sm text-[#667085]">{description}</p>
          {action}
        </div>
      </td>
    </tr>
  );
}
