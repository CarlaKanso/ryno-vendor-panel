"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Labelled form controls.
 *
 * Every control gets a real `<label htmlFor>` — the filter bar is the part of
 * this panel a keyboard or screen-reader user has to get through before they
 * can do anything else.
 */

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-ink-600"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

const CONTROL_CLASSES =
  "h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-ryno-600 focus:outline-none focus:ring-2 focus:ring-ryno-600/20 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_CLASSES, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL_CLASSES, "appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
    </div>
  );
}

/** A labelled select in one call — most filters are exactly this. */
export function SelectField({
  label,
  options,
  placeholder,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  placeholder?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className={className}>
      <Select id={id} {...props}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function TextareaInput({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        CONTROL_CLASSES,
        "h-auto min-h-24 resize-y py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
