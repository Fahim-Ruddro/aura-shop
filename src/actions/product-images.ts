"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";
import {
  productImageSchema,
  type ProductImageFormValues,
} from "@/lib/validations/catalog";

export interface ImageActionResult {
  success?: boolean;
  error?: string;
}

async function syncPrimaryImageToProduct(productId: string) {
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("product_images")
    .select("id, image_url, is_primary")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!images || images.length === 0) {
    return;
  }

  const primary = images.find((img) => img.is_primary) ?? images[0];
  if (!primary.is_primary) {
    await supabase
      .from("product_images")
      .update({ is_primary: true })
      .eq("id", primary.id);
  }

  await supabase
    .from("products")
    .update({ image_url: primary.image_url })
    .eq("id", productId);
}

export async function addProductImageAction(
  productId: string,
  values: ProductImageFormValues
): Promise<ImageActionResult> {
  try {
    await requireSectionWriteAccess("products");

    if (!productId) {
      return { error: "Product ID is required." };
    }

    const parsed = productImageSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid image data." };
    }

    const supabase = await createClient();

    const { count } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    const isFirstImage = (count ?? 0) === 0;
    const makePrimary = parsed.data.is_primary || isFirstImage;

    if (makePrimary) {
      await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);
    }

    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      image_url: parsed.data.image_url,
      alt_text: parsed.data.alt_text,
      is_primary: makePrimary,
      display_order: (count ?? 0) + 1,
    });

    if (error) {
      return { error: error.message };
    }

    await syncPrimaryImageToProduct(productId);

    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add product image.",
    };
  }
}

export async function setPrimaryProductImageAction(
  imageId: string,
  productId: string
): Promise<ImageActionResult> {
  try {
    await requireSectionWriteAccess("products");

    const supabase = await createClient();

    await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId);

    const { error } = await supabase
      .from("product_images")
      .update({ is_primary: true })
      .eq("id", imageId)
      .eq("product_id", productId);

    if (error) {
      return { error: error.message };
    }

    await syncPrimaryImageToProduct(productId);

    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to set primary image.",
    };
  }
}

export async function reorderProductImageAction(
  imageId: string,
  productId: string,
  direction: "up" | "down"
): Promise<ImageActionResult> {
  try {
    await requireSectionWriteAccess("products");

    const supabase = await createClient();
    const { data: images, error: fetchError } = await supabase
      .from("product_images")
      .select("id, display_order")
      .eq("product_id", productId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fetchError || !images) {
      return { error: fetchError?.message ?? "Could not load images." };
    }

    const index = images.findIndex((img) => img.id === imageId);
    if (index === -1) return { error: "Image not found." };

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) {
      return { success: true };
    }

    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    await Promise.all(
      reordered.map((img, idx) =>
        supabase
          .from("product_images")
          .update({ display_order: idx + 1 })
          .eq("id", img.id)
      )
    );

    revalidatePath(`/admin/products/${productId}/edit`);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to reorder image.",
    };
  }
}

export async function deleteProductImageAction(
  imageId: string,
  productId: string
): Promise<ImageActionResult> {
  try {
    await requireSectionWriteAccess("products");

    const supabase = await createClient();
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .eq("product_id", productId);

    if (error) {
      return { error: error.message };
    }

    await syncPrimaryImageToProduct(productId);

    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete product image.",
    };
  }
}