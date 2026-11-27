"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";

export interface CustomerActionResult {
  success?: boolean;
  error?: string;
}

export async function toggleCustomerBlockAction(
  customerId: string,
  shouldBlock: boolean
): Promise<CustomerActionResult> {
  try {
    const actor = await requireSectionWriteAccess("customers");

    if (!customerId) {
      return { error: "Customer ID is required." };
    }

    if (customerId === actor.id) {
      return { error: "You cannot block your own account." };
    }

    const supabase = await createClient();

    const { data: targetProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", customerId)
      .single();

    if (fetchError || !targetProfile) {
      return { error: "Customer account not found." };
    }

    if (targetProfile.role !== "customer") {
      return {
        error: "Staff, Manager, and Admin accounts cannot be modified from Customers.",
      };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: shouldBlock })
      .eq("id", customerId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update account status.",
    };
  }
}