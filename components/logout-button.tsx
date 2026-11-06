import { Power } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getT } from "@/server/i18n";
import { logout } from "@/server/modules/auth/actions";

export async function LogoutButton({
  variant = "secondary",
}: {
  variant?: "secondary" | "ghost";
}) {
  const t = await getT();
  return (
    <form action={logout}>
      <button type="submit" className={buttonClass(variant, "md")}>
        <Power className="size-4" aria-hidden />
        {t("Sign out")}
      </button>
    </form>
  );
}
