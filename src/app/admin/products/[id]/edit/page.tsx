import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type {
  Category,
  Product,
  ProductImage,
  ProductVariant,
} from "@/types/database";
import { ProductForm } from "@/components/admin/products/product-form";
import { ProductImagesManager } from "@/components/admin/products/product-images-manager";
import { ProductVariantsManager } from "@/components/admin/products/product-variants-manager";

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

  const [
    { data: productData },
    { data: categoriesData },
    { data: variantsData },
    { data: imagesData },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("categories")
      .select("id, name")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!productData) {
    notFound();
  }

  const product = productData as Product;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-sm text-muted-foreground">
          Update core details, pack size variants, multi-image gallery, and visibility
          for <strong className="text-foreground">{product.name}</strong>.
        </p>
      </div>

      <ProductForm
        mode="edit"
        categories={(categoriesData ?? []) as Pick<Category, "id" | "name">[]}
        initialProduct={product}
      />

      <ProductVariantsManager
        productId={product.id}
        productSlug={product.slug}
        basePrice={Number(product.price)}
        variants={(variantsData ?? []) as ProductVariant[]}
      />

      <ProductImagesManager
        productId={product.id}
        productName={product.name}
        images={(imagesData ?? []) as ProductImage[]}
      />
    </div>
  );
}