import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminProductsPage() {
  const profile = await requireAdminPageAccess("products");
  const canEdit = canWriteSection(profile.role, "products");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage Aura Shop catalog items, variants, pricing in BDT (৳), and status.
          </p>
        </div>
        <Badge variant={canEdit ? "default" : "secondary"}>
          {canEdit ? "Full Edit Access" : "View Only (Staff)"}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog (Milestone M1 — Day 2)</CardTitle>
          <CardDescription>
            Searchable TanStack product table, Zod-validated create/edit forms, and product
            archiving are scheduled for Day 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No products yet.
        </CardContent>
      </Card>
    </div>
  );
}