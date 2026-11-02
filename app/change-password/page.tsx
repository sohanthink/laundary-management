import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { LogoutButton } from "@/components/logout-button";
import { ActionForm } from "@/components/ui/action-form";
import { TextField } from "@/components/ui/field";
import { requireUser } from "@/server/auth/dal";
import { changePassword } from "@/server/modules/auth/actions";

export const metadata: Metadata = {
  title: "Change password",
};

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });

  return (
    <AuthCard
      title={user.mustChangePassword ? "Set your password" : "Change password"}
      description={
        user.mustChangePassword
          ? "You signed in with a temporary password. Choose your own to continue."
          : "Other devices will be signed out after the change."
      }
    >
      <div className="mt-8">
        <ActionForm
          action={changePassword}
          submitLabel="Update password"
          pendingLabel="Updating..."
        >
          <TextField
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <TextField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            required
          />
          <TextField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </ActionForm>
        <div className="mt-4 flex justify-end">
          <LogoutButton variant="ghost" />
        </div>
      </div>
    </AuthCard>
  );
}
