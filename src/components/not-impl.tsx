import { Construction } from "lucide-react";

export default function NotImpl() {
  return (
    <div className="flex m-auto min-h-64 w-full items-center justify-center px-6 py-12">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
          <Construction className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-4 text-base font-semibold text-[#111827]">Not implemented</p>
      </div>
    </div>
  );
}
