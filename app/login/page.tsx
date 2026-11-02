import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/server/auth/dal";
import { homePathFor } from "@/server/auth/permissions";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : homePathFor(user));

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage laundry orders and customers."
    >
      <LoginForm />
      <p className="mt-6 text-center text-sm text-(--muted)">
        <Link href="/" className="font-medium text-(--teal) hover:underline">
          Back to home
        </Link>
      </p>
    </AuthCard>
  );
}
