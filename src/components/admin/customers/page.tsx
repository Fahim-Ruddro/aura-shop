import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type { Profile } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import {
  CustomersManager,
  type CustomerSummaryRow,
} from "@/components/admin/customers/customers-manager";

export default async function AdminCustomersPage() {
  const profile = await requireAdminPageAccess("customers");
  const canEdit = canWriteSection(profile.role, "customers");

  const supabase = await createClient();

  const [{ data: profilesData, error }, { data: ordersData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("customer_id, total_amount, status"),
    ]);

  const statsByCustomer = new Map<
    string,
    { count: number; totalSpent: number }
  >();

  for (const ord of ordersData ?? []) {
    if (!ord.customer_id) continue;
    const prev = statsByCustomer.get(ord.customer_id) ?? {
      count: 0,
      totalSpent: 0,
    };
    prev.count += 1;
    if (ord.status !== "cancelled" && ord.status !== "returned") {
      prev.totalSpent += Number(ord.total_amount ?? 0);
    }
    statsByCustomer.set(ord.customer_id, prev);
  }

  const customerRows: CustomerSummaryRow[] = (
    (profilesData ?? []) as Profile[]
  ).map((cust) => {
    const stats = statsByCustomer.get(cust.id) ?? { count: 0, totalSpent: 0 };
    return {
      ...cust,
      orders_count: stats.count,
      total_spent: stats.totalSpent,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Inspect customer purchase history, lifetime value in BDT (৳), and
            account access.
          </p>
        </div>
        <Badge variant={canEdit ? "default" : "secondary"}>
          {canEdit ? "Manager / Admin Access" : "View Only"}
        </Badge>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Failed to load customers: {error.message}
        </div>
      ) : (
        <CustomersManager customers={customerRows} canEdit={canEdit} />
      )}
    </div>
  );
}