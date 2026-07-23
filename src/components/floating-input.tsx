"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";

type FloatingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  containerClassName?: string;
  inputClassName?: string;
};

export function FloatingInput({
  label,
  containerClassName = "",
  inputClassName = "",
  id,
  value,
  onBlur,
  onChange,
  onFocus,
  ...props
}: FloatingInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [valid, setValid] = useState(true);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    String(props.defaultValue ?? "").length > 0,
  );
  const hasValue =
    value === undefined
      ? uncontrolledValue
      : Array.isArray(value)
        ? value.length > 0
        : String(value).length > 0;
  const active = focused || hasValue;

  useEffect(() => {
    if (inputRef.current) setValid(inputRef.current.checkValidity());
  }, [value]);

  const underlineClass =
    (hasValue || touched) && !valid
      ? "border-[#d92d20]"
      : hasValue && valid
        ? "border-[#039855]"
        : focused
          ? "border-[#0284c7]"
          : "border-[#d0d5dd]";

  return (
    <div className={`relative min-w-0 ${containerClassName}`}>
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        value={value}
        placeholder={props.placeholder ?? " "}
        aria-invalid={(hasValue || touched) && !valid}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          setTouched(true);
          setValid(event.currentTarget.checkValidity());
          onBlur?.(event);
        }}
        onChange={(event) => {
          if (value === undefined) setUncontrolledValue(event.currentTarget.value.length > 0);
          setValid(event.currentTarget.checkValidity());
          onChange?.(event);
        }}
        className={`h-12 w-full border-0 border-b-2 bg-transparent px-0 pb-1 pt-5 text-sm text-[#101828] outline-none transition placeholder:text-transparent focus:placeholder:text-[#98a2b3] disabled:cursor-not-allowed disabled:text-[#98a2b3] ${underlineClass} ${inputClassName}`}
      />
      <label
        htmlFor={inputId}
        className={`pointer-events-none absolute left-0 transition-all ${active ? "top-0 text-xs font-medium text-[#667085]" : "top-1/2 -translate-y-1/2 text-sm text-[#344054]"}`}
      >
        {label}
      </label>
    </div>
  );
}
