import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminActivityLogPage() {
  await requireAdminPageAccess("activity-log");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Admin-only audit trail recording all changes across products, stock, orders,
          coupons, settings, and roles.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail (Milestone M3 — Day 6)</CardTitle>
          <CardDescription>
            Filterable audit logs with user, action type, timestamp, and before/after diffs
            are scheduled for Day 6.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No activity logged yet.
        </CardContent>
      </Card>
    </div>
  );
}