"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSectionWriteAccess } from "@/lib/auth/guards";
import {
  addOrderNoteSchema,
  checkoutSchema,
  getAllowedNextStatuses,
  transitionOrderSchema,
  updatePaymentStatusSchema,
  type CheckoutFormValues,
} from "@/lib/validations/orders";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export interface OrderActionResult {
  success?: boolean;
  orderId?: string;
  error?: string;
}

export async function placeOrderAction(
  values: CheckoutFormValues
): Promise<OrderActionResult> {
  try {
    const parsed = checkoutSchema.safeParse(values);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid checkout information.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Please sign in before placing an order." };
    }

    const { data: orderId, error } = await supabase.rpc("place_customer_order", {
      p_customer_name: parsed.data.customer_name,
      p_customer_email: parsed.data.customer_email,
      p_customer_phone: parsed.data.customer_phone,
      p_shipping_address: parsed.data.shipping_address,
      p_delivery_zone: parsed.data.delivery_zone,
      p_payment_method: parsed.data.payment_method,
      p_customer_note: parsed.data.customer_note,
      p_items: parsed.data.items,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/customers");
    return { success: true, orderId: orderId as string };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to place order.",
    };
  }
}

export async function transitionOrderStatusAction(
  orderId: string,
  nextStatus: OrderStatus,
  note: string
): Promise<OrderActionResult> {
  try {
    await requireSectionWriteAccess("orders");

    const parsed = transitionOrderSchema.safeParse({
      order_id: orderId,
      next_status: nextStatus,
      note,
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid status transition.",
      };
    }

    const supabase = await createClient();

    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", parsed.data.order_id)
      .single();

    if (fetchError || !existingOrder) {
      return { error: "Order not found." };
    }

    const allowed = getAllowedNextStatuses(existingOrder.status as OrderStatus);
    if (!allowed.includes(parsed.data.next_status)) {
      return {
        error: `Cannot move order from "${existingOrder.status}" to "${parsed.data.next_status}".`,
      };
    }

    const { error } = await supabase.rpc("transition_order_status", {
      p_order_id: parsed.data.order_id,
      p_next_status: parsed.data.next_status,
      p_note: parsed.data.note,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    revalidatePath(`/admin/orders/${parsed.data.order_id}/invoice`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update order status.",
    };
  }
}

export async function updateOrderPaymentStatusAction(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<OrderActionResult> {
  try {
    await requireSectionWriteAccess("orders");

    const parsed = updatePaymentStatusSchema.safeParse({
      order_id: orderId,
      payment_status: paymentStatus,
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid payment status.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: parsed.data.payment_status })
      .eq("id", parsed.data.order_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    revalidatePath(`/admin/orders/${parsed.data.order_id}/invoice`);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update payment status.",
    };
  }
}

export async function addInternalOrderNoteAction(
  orderId: string,
  note: string
): Promise<OrderActionResult> {
  try {
    const profile = await requireSectionWriteAccess("orders");

    const parsed = addOrderNoteSchema.safeParse({
      order_id: orderId,
      note,
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid internal note.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("order_notes").insert({
      order_id: parsed.data.order_id,
      author_id: profile.id,
      note: parsed.data.note,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add internal note.",
    };
  }
}