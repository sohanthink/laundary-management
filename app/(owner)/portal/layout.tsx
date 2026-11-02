import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requirePermission } from "@/server/auth/dal";

export const metadata: Metadata = {
  title: { default: "My hotels", template: "%s | an-nafi" },
};

const NAV = [
  { href: "/portal", label: "My hotels", exact: true },
  { href: "/portal/profile", label: "Profile" },
];

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const user = await requirePermission("portal:access");

  return (
    <AppShell nav={NAV} homeHref="/portal" userName={user.name} roleLabel="Hotel owner">
      {children}
    </AppShell>
  );
}
