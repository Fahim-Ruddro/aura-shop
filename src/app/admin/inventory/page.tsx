import { requireAdminPageAccess } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminInventoryPage() {
  await requireAdminPageAccess("inventory");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Monitor variant stock levels, low-stock alerts, and audit stock movements.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stock & Movements (Day 3)</CardTitle>
          <CardDescription>
            Variant SKUs, low-stock badges, stock adjustment dialogs, and movement logs
            are scheduled for Day 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No inventory variants yet.
        </CardContent>
      </Card>
    </div>
  );
}