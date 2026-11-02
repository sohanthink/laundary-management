import { buttonClass } from "@/components/ui/button";
import { logout } from "@/server/modules/auth/actions";

export function LogoutButton({
  variant = "secondary",
}: {
  variant?: "secondary" | "ghost";
}) {
  return (
    <form action={logout}>
      <button type="submit" className={buttonClass(variant, "sm")}>
        Sign out
      </button>
    </form>
  );
}
