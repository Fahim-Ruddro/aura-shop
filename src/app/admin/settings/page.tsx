import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  await requireAdminPageAccess("settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Admin-only configuration for Dhaka/Outside Dhaka delivery charges and staff roles.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Delivery Charges & Staff Management (Day 5)</CardTitle>
          <CardDescription>
            Database-backed delivery fees (Inside Dhaka, Outside Dhaka, Free Delivery
            threshold) and staff role assignment are scheduled for Day 5.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Admin access verified.
        </CardContent>
      </Card>
    </div>
  );
}