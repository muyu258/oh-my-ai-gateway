import type { ReactNode } from "react";

export function FormSectionCard({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg bg-[#f5f5f7] px-4 py-3 sm:px-5 sm:py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#101828]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
