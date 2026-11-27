import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type { CategoryWithCount } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { CategoriesManager } from "@/components/admin/categories/categories-manager";

export default async function AdminCategoriesPage() {
  const profile = await requireAdminPageAccess("categories");
  const canEdit = canWriteSection(profile.role, "categories");

  const supabase = await createClient();
  const { data: categoriesData, error } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const categories: CategoryWithCount[] = (categoriesData ?? []).map((row) => {
    const productRel = row.products as Array<{ count: number }> | null;
    const productCount = productRel?.[0]?.count ?? 0;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      image_url: row.image_url,
      display_order: row.display_order,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product_count: productCount,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize Aura Shop departments, URL slugs, display order, and storefront
            visibility.
          </p>
        </div>
        <Badge variant={canEdit ? "default" : "secondary"}>
          {canEdit ? "Full Edit Access" : "View Only (Staff)"}
        </Badge>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Failed to load categories: {error.message}
        </div>
      ) : (
        <CategoriesManager categories={categories} canEdit={canEdit} />
      )}
    </div>
  );
}