import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminReportsPage() {
  await requireAdminPageAccess("reports");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sales analytics by date range, top products, category breakdown, and CSV exports.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sales Analytics & CSV Export (Milestone M3 — Day 6)</CardTitle>
          <CardDescription>
            Database-aggregated sales reports and CSV downloads for orders, products, and
            customers are scheduled for Day 6.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No sales report data yet.
        </CardContent>
      </Card>
    </div>
  );
}