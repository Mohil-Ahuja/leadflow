import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-ink-faint " +
  "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "aria-[invalid=true]:border-overdue aria-[invalid=true]:ring-overdue/20";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, required, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const messageId = `${inputId}-message`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="text-overdue" aria-hidden>
            *
          </span>
        ) : (
          <span className="text-[13px] font-normal text-ink-faint">optional</span>
        )}
      </label>
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={inputClass}
        {...props}
      />
      {(error || hint) && (
        <p id={messageId} className={clsx("mt-1.5 text-[13px]", error ? "text-overdue" : "text-ink-faint")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
