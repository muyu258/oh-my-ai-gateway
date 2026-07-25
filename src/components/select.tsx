"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

export type SelectOption<T extends string> = {
  label: string;
  value: T;
  disabled?: boolean;
};

const encodeValue = (value: string): string => `value:${value}`;
const decodeValue = (value: string): string => value.slice("value:".length);

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  disabled = false,
  placeholder,
  ariaLabel,
  size = "md",
  icon,
  className = "",
  hideChevron = false,
}: {
  value?: T;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
  hideChevron?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === value);
  const sizeClassName = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-3 text-sm";

  return (
    <SelectPrimitive.Root
      value={value === undefined ? undefined : encodeValue(value)}
      onValueChange={(nextValue) => onValueChange(decodeValue(nextValue) as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={`inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white font-medium text-[#344054] outline-none transition hover:bg-[#f9fafb] focus:border-[#0284c7] focus:ring-2 focus:ring-[#bae6fd] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${sizeClassName} ${className}`}
      >
        {icon ? <span className="shrink-0 text-[#667085]">{icon}</span> : null}
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 flex-1 truncate text-left"
        >
          {selectedOption?.label}
        </SelectPrimitive.Value>
        {hideChevron ? null : (
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="ml-auto size-4 shrink-0 text-[#667085]" aria-hidden="true" />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-select-content=""
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[#e5e7eb] bg-white text-sm text-[#344054] shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 cursor-default items-center justify-center bg-white text-[#667085]">
            <ChevronUp className="size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={encodeValue(option.value)}
                disabled={option.disabled}
                className="relative flex h-9 cursor-pointer select-none items-center rounded-md py-0 pl-8 pr-3 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-[#f0f9ff] data-[highlighted]:text-[#075985] data-[disabled]:opacity-50"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-4 text-[#0284c7]" strokeWidth={2.5} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-7 cursor-default items-center justify-center bg-white text-[#667085]">
            <ChevronDown className="size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
