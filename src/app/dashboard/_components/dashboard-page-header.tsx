import type { ReactNode } from "react";

export function DashboardPageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#344054]">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[#101828]">{title}</h1>
          <p className="mt-0.5 text-sm text-[#667085]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
