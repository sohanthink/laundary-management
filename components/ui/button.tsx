import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-(--teal) text-white hover:bg-(--teal-dark)",
  secondary:
    "border border-(--line) bg-white text-(--ink) hover:border-(--teal) hover:text-(--teal)",
  ghost: "text-(--teal) hover:bg-(--teal-soft)",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dark: "bg-(--ink) text-white hover:bg-black",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  extra = "",
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

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

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function LinkButton({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
