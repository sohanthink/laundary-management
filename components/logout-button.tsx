import { Power } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getT } from "@/server/i18n";
import { logout } from "@/server/modules/auth/actions";

export async function LogoutButton({
  variant = "secondary",
  compact = false,
}: {
  variant?: "secondary" | "ghost";
  /** Below laptop width, show only the icon (the label stays for screen readers). */
  compact?: boolean;
}) {
  const t = await getT();
  return (
    <form action={logout}>
      <button type="submit" className={`${buttonClass(variant, "md")} ${compact ? "max-xl:px-3.5" : ""}`}>
        <Power className="size-4" aria-hidden />
        <span className={compact ? "max-xl:sr-only" : undefined}>{t("Sign out")}</span>
      </button>
    </form>
  );
}
