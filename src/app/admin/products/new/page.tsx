import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type { Category } from "@/types/database";
import { ProductForm } from "@/components/admin/products/product-form";

export default async function NewProductPage() {
  const profile = await requireAdminPageAccess("products");
  if (!canWriteSection(profile.role, "products")) {
    redirect("/admin/products?error=forbidden");
  }

  const supabase = await createClient();
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
        <p className="text-sm text-muted-foreground">
          Create a new Aura Shop product with BDT (৳) pricing and storefront status.
        </p>
      </div>

      <ProductForm
        mode="create"
        categories={(categoriesData ?? []) as Pick<Category, "id" | "name">[]}
      />
    </div>
  );
}