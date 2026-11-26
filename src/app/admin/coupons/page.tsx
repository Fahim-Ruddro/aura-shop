import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminCouponsPage() {
  await requireAdminPageAccess("coupons");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage promotional discount codes and usage limits.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Promotions & Coupons (Day 5)</CardTitle>
          <CardDescription>
            Percentage and fixed BDT coupons with server-side checkout validation are
            scheduled for Day 5.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No coupons created yet.
        </CardContent>
      </Card>
    </div>
  );
}