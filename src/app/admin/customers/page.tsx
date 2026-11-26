import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminCustomersPage() {
  await requireAdminPageAccess("customers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          View customer profiles, spend totals, order history, and account status.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer Directory (Day 5)</CardTitle>
          <CardDescription>
            Customer search, detail views, and block/unblock controls are scheduled for
            Day 5.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No customer orders recorded yet.
        </CardContent>
      </Card>
    </div>
  );
}