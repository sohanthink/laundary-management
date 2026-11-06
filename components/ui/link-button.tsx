import Link from "next/link";
import type { ComponentProps } from "react";
import { translateNode } from "@/server/i18n";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button";

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export async function LinkButton({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {await translateNode(children)}
    </Link>
  );
}
