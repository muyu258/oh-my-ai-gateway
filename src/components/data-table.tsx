import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  CSSProperties,
  ReactNode,
} from "react";

const classes = (...values: Array<string | undefined>): string => values.filter(Boolean).join(" ");

export function DataTable({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return <table className={classes("w-full border-collapse", className)} {...props} />;
}

export function DataTableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={classes("bg-[#fbfbfd]", className)} {...props} />;
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
  pinned?: "left" | "right";
  pinOffset?: CSSProperties["left"] | CSSProperties["right"];
  pinnedBoundary?: boolean;
};

const pinnedStyle = (
  pinned: PinnedCellProps["pinned"],
  pinOffset: PinnedCellProps["pinOffset"],
  style: CSSProperties | undefined,
): CSSProperties | undefined => {
  if (pinned === "left") return { ...style, left: pinOffset };
  if (pinned === "right") return { ...style, right: pinOffset };
  return style;
};

export function DataTableHead({
  className,
  pinned,
  pinOffset = 0,
  pinnedBoundary = true,
  scope = "col",
  style,
  ...props
}: ComponentPropsWithoutRef<"th"> & PinnedCellProps) {
  return (
    <th
      className={classes(
        "sticky top-0 z-10 bg-[#fbfbfd] px-5 py-3 shadow-[inset_0_-1px_0_#e5e7eb]",
        pinned ? `data-table-pinned-${pinned} z-20` : undefined,
        pinned && pinnedBoundary ? `data-table-pinned-boundary-${pinned}` : undefined,
        className,
      )}
      scope={scope}
      style={pinnedStyle(pinned, pinOffset, style)}
      {...props}
    />
  );
}

export function DataTableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={classes("divide-y divide-[#eef0f3]", className)} {...props} />;
}

export function DataTableRow({ className, ...props }: ComponentPropsWithRef<"tr">) {
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
        pinned
          ? `data-table-pinned-${pinned} sticky z-[2] bg-white transition-colors duration-150 ease-out group-hover:bg-[#f7f7f9]`
          : undefined,
        pinned && pinnedBoundary ? `data-table-pinned-boundary-${pinned}` : undefined,
        className,
      )}
      style={pinnedStyle(pinned, pinOffset, style)}
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
    <tr className="h-full">
      <td className="h-full" colSpan={colSpan}>
        <div
          className={classes(
            "flex h-full min-h-72 flex-col items-center justify-center px-6 py-12 text-center",
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
