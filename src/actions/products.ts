"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";
import {
  parseTagsInput,
  productSchema,
  type ProductFormValues,
} from "@/lib/validations/catalog";

export interface ProductActionResult {
  success?: boolean;
  productId?: string;
  error?: string;
}

export async function createProductAction(
  values: ProductFormValues
): Promise<ProductActionResult> {
  try {
    await requireSectionWriteAccess("products");

    const parsed = productSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid product data." };
    }

    const supabase = await createClient();
    const tags = parseTagsInput(parsed.data.tags_input);
    const cleanImageUrl = parsed.data.image_url || null;

    const { data: createdProduct, error } = await supabase
      .from("products")
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        short_description: parsed.data.short_description,
        full_description: parsed.data.full_description,
        category_id: parsed.data.category_id,
        brand: parsed.data.brand,
        country_of_origin: parsed.data.country_of_origin,
        price: parsed.data.price,
        sale_price: parsed.data.sale_price,
        stock: parsed.data.stock,
        image_url: cleanImageUrl,
        status: parsed.data.status,
        tags,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "A product with this slug already exists. Please use a unique slug." };
      }
      return { error: error.message };
    }

    if (createdProduct?.id && cleanImageUrl) {
      await supabase.from("product_images").insert({
        product_id: createdProduct.id,
        image_url: cleanImageUrl,
        alt_text: parsed.data.name,
        is_primary: true,
        display_order: 1,
      });
    }

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { success: true, productId: createdProduct?.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create product.",
    };
  }
}

export async function updateProductAction(
  id: string,
  values: ProductFormValues
): Promise<ProductActionResult> {
  try {
    await requireSectionWriteAccess("products");

    if (!id) {
      return { error: "Product ID is required." };
    }

    const parsed = productSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid product data." };
    }

    const supabase = await createClient();
    const tags = parseTagsInput(parsed.data.tags_input);

    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        short_description: parsed.data.short_description,
        full_description: parsed.data.full_description,
        category_id: parsed.data.category_id,
        brand: parsed.data.brand,
        country_of_origin: parsed.data.country_of_origin,
        price: parsed.data.price,
        sale_price: parsed.data.sale_price,
        stock: parsed.data.stock,
        image_url: parsed.data.image_url || null,
        status: parsed.data.status,
        tags,
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { error: "A product with this slug already exists. Please use a unique slug." };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { success: true, productId: id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update product.",
    };
  }
}

export async function archiveProductAction(id: string): Promise<ProductActionResult> {
  try {
    await requireSectionWriteAccess("products");

    if (!id) {
      return { error: "Product ID is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to archive product.",
    };
  }
}