import { requireAdminPageAccess } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdminPageAccess();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}