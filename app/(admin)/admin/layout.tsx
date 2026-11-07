import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { QuickActions } from "@/components/quick-actions";
import { requirePermission } from "@/server/auth/dal";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | an-nafi admin" },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePermission("admin:access");

  return (
    <AppShell homeHref="/admin" userName={user.name} roleLabel="Admin" actions={<QuickActions />}>
      {children}
    </AppShell>
  );
}
