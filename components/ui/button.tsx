import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft)";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-(--teal) text-white hover:bg-(--teal-dark)",
  secondary:
    "border border-(--line) bg-white text-(--ink) hover:border-(--teal) hover:text-(--teal)",
  ghost: "text-(--teal) hover:bg-(--teal-soft)",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dark: "bg-(--ink) text-white hover:bg-black",
};

// Touch-friendly heights: 40 / 48 / 56 px.
const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-6 text-base",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}
