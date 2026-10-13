import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover disabled:opacity-60",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-sunken disabled:opacity-60",
  ghost: "text-ink-soft hover:text-ink hover:bg-sunken",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={twMerge(clsx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
        size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
        variants[variant],
        className,
      ))}
      {...props}
    />
  );
});
