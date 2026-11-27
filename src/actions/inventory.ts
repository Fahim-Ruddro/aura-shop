"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";
import {
  stockAdjustmentSchema,
  type StockAdjustmentValues,
} from "@/lib/validations/catalog";

export interface InventoryActionResult {
  success?: boolean;
  error?: string;
}

export async function adjustStockAction(
  values: StockAdjustmentValues
): Promise<InventoryActionResult> {
  try {
    await requireSectionWriteAccess("inventory");

    const parsed = stockAdjustmentSchema.safeParse(values);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid stock adjustment data.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_stock_adjustment", {
      p_product_id: parsed.data.product_id,
      p_variant_id: parsed.data.variant_id,
      p_movement_type: parsed.data.movement_type,
      p_quantity_change: parsed.data.quantity_change,
      p_reason: parsed.data.reason,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.product_id}/edit`);
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to adjust stock.",
    };
  }
}