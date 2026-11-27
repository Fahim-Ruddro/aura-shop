"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";
import { categorySchema, type CategoryFormValues } from "@/lib/validations/catalog";

export interface ActionResult {
  success?: boolean;
  error?: string;
}

export async function createCategoryAction(
  values: CategoryFormValues
): Promise<ActionResult> {
  try {
    await requireSectionWriteAccess("categories");

    const parsed = categorySchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid category data." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("categories").insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      image_url: parsed.data.image_url || null,
      display_order: parsed.data.display_order,
      is_active: parsed.data.is_active,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "A category with this slug already exists. Please use a unique slug." };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create category.",
    };
  }
}

export async function updateCategoryAction(
  id: string,
  values: CategoryFormValues
): Promise<ActionResult> {
  try {
    await requireSectionWriteAccess("categories");

    if (!id) {
      return { error: "Category ID is required." };
    }

    const parsed = categorySchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid category data." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        image_url: parsed.data.image_url || null,
        display_order: parsed.data.display_order,
        is_active: parsed.data.is_active,
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { error: "A category with this slug already exists. Please use a unique slug." };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update category.",
    };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await requireSectionWriteAccess("categories");

    if (!id) {
      return { error: "Category ID is required." };
    }

    const supabase = await createClient();

    // Prevent deleting a category that still has products (including draft or archived)
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countError) {
      return { error: countError.message };
    }

    if ((count ?? 0) > 0) {
      return {
        error: `Cannot delete this category because ${count} product${
          count === 1 ? " is" : "s are"
        } still assigned to it. Reassign or remove those products first.`,
      };
    }

    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete category.",
    };
  }
}