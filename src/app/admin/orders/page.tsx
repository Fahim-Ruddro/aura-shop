import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOrdersPage() {
  const profile = await requireAdminPageAccess("orders");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage customer orders, payment statuses, and fulfillment timelines (Role:{" "}
          {profile.role}).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Order Management (Milestone M2 — Day 4)</CardTitle>
          <CardDescription>
            Full order filtering, status workflow transitions, stock restoration on
            cancel/return, and printable invoices are scheduled for Day 4.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No orders yet.
        </CardContent>
      </Card>
    </div>
  );
}