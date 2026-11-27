"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";
import { variantSchema, type VariantFormValues } from "@/lib/validations/catalog";

export interface VariantActionResult {
  success?: boolean;
  error?: string;
}

export async function createVariantAction(
  productId: string,
  values: VariantFormValues
): Promise<VariantActionResult> {
  try {
    await requireSectionWriteAccess("products");

    if (!productId) {
      return { error: "Product ID is required." };
    }

    const parsed = variantSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid variant data." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      price: parsed.data.price,
      sale_price: parsed.data.sale_price,
      stock: parsed.data.stock,
      display_order: parsed.data.display_order,
      is_active: parsed.data.is_active,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "This SKU already exists on another item. Please enter a unique SKU." };
      }
      return { error: error.message };
    }

    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create variant.",
    };
  }
}

export async function updateVariantAction(
  variantId: string,
  productId: string,
  values: VariantFormValues
): Promise<VariantActionResult> {
  try {
    await requireSectionWriteAccess("products");

    if (!variantId || !productId) {
      return { error: "Variant ID and Product ID are required." };
    }

    const parsed = variantSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid variant data." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("product_variants")
      .update({
        name: parsed.data.name,
        sku: parsed.data.sku,
        price: parsed.data.price,
        sale_price: parsed.data.sale_price,
        stock: parsed.data.stock,
        display_order: parsed.data.display_order,
        is_active: parsed.data.is_active,
      })
      .eq("id", variantId)
      .eq("product_id", productId);

    if (error) {
      if (error.code === "23505") {
        return { error: "This SKU already exists on another item. Please enter a unique SKU." };
      }
      return { error: error.message };
    }

    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update variant.",
    };
  }
}

export async function deleteVariantAction(
  variantId: string,
  productId: string
): Promise<VariantActionResult> {
  try {
    await requireSectionWriteAccess("products");

    if (!variantId || !productId) {
      return { error: "Variant ID and Product ID are required." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variantId)
      .eq("product_id", productId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete variant.",
    };
  }
}