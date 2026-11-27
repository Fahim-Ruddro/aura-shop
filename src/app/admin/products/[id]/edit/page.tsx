import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type { Category, Product } from "@/types/database";
import { ProductForm } from "@/components/admin/products/product-form";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const profile = await requireAdminPageAccess("products");
  if (!canWriteSection(profile.role, "products")) {
    redirect("/admin/products?error=forbidden");
  }

  const supabase = await createClient();

  const [{ data: productData }, { data: categoriesData }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("categories")
      .select("id, name")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!productData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-sm text-muted-foreground">
          Update details, pricing, stock, or status for{" "}
          <strong className="text-foreground">{productData.name}</strong>.
        </p>
      </div>

      <ProductForm
        mode="edit"
        categories={(categoriesData ?? []) as Pick<Category, "id" | "name">[]}
        initialProduct={productData as Product}
      />
    </div>
  );
}