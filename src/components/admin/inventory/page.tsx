import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type {
  ProductWithCategory,
  StockMovementWithDetails,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { InventoryManager } from "@/components/admin/inventory/inventory-manager";

export default async function AdminInventoryPage() {
  const profile = await requireAdminPageAccess("inventory");
  const canAdjust = canWriteSection(profile.role, "inventory");

  const supabase = await createClient();

  const [{ data: productsData, error: prodError }, { data: movementsData }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "*, categories(id, name, slug, is_active), product_variants(*)"
        )
        .neq("status", "archived")
        .order("name", { ascending: true }),
      supabase
        .from("stock_movements")
        .select(
          "*, products(id, name, slug), product_variants(id, name, sku), profiles(full_name, email)"
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory & Stock</h1>
          <p className="text-sm text-muted-foreground">
            Monitor low-stock alerts across products and size variants, and record
            audited stock movements.
          </p>
        </div>
        <Badge variant={canAdjust ? "default" : "secondary"}>
          {canAdjust ? "Full Stock Control" : "View Only (Staff)"}
        </Badge>
      </div>

      {prodError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Failed to load inventory: {prodError.message}
        </div>
      ) : (
        <InventoryManager
          products={(productsData ?? []) as ProductWithCategory[]}
          movements={(movementsData ?? []) as StockMovementWithDetails[]}
          canAdjust={canAdjust}
        />
      )}
    </div>
  );
}